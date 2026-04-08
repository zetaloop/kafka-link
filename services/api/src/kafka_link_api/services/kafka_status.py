from dataclasses import dataclass

from confluent_kafka import ConsumerGroupTopicPartitions, TopicPartition
from confluent_kafka.admin import AdminClient, OffsetSpec


def _enum_value(value: object) -> str | None:
    if value is None:
        return None
    return getattr(value, "name", None) or str(value)


@dataclass(slots=True)
class KafkaStatusService:
    bootstrap_servers: str

    def __post_init__(self) -> None:
        self.admin = AdminClient({"bootstrap.servers": self.bootstrap_servers})

    def read_cluster(self) -> dict[str, object]:
        cluster = self.admin.describe_cluster(request_timeout=5).result()
        metadata = self.admin.list_topics(timeout=5)

        return {
            "cluster_id": cluster.cluster_id,
            "controller": self._node_to_dict(cluster.controller),
            "brokers": [self._node_to_dict(node) for node in cluster.nodes],
            "topics": [
                self._topic_to_dict(topic_name, topic_metadata)
                for topic_name, topic_metadata in metadata.topics.items()
            ],
        }

    def list_groups(self) -> list[dict[str, object]]:
        result = self.admin.list_consumer_groups(request_timeout=5).result()
        return [
            {
                "group_id": item.group_id,
                "state": _enum_value(getattr(item, "state", None)),
                "type": _enum_value(getattr(item, "type", None)),
                "is_simple_consumer_group": getattr(item, "is_simple_consumer_group", None),
            }
            for item in result.valid or []
        ]

    def read_group(self, group_id: str) -> dict[str, object] | None:
        if group_id not in {item["group_id"] for item in self.list_groups()}:
            return None

        groups = self.admin.describe_consumer_groups([group_id], request_timeout=5)
        description = groups[group_id].result()
        offsets_result = self.admin.list_consumer_group_offsets(
            [ConsumerGroupTopicPartitions(group_id)], request_timeout=5
        )
        committed = offsets_result[group_id].result().topic_partitions or []
        latest_offsets = self._read_latest_offsets(committed)

        return {
            "group": {
                "group_id": description.group_id,
                "state": _enum_value(getattr(description, "state", None)),
                "type": _enum_value(getattr(description, "type", None)),
                "partition_assignor": getattr(description, "partition_assignor", None),
                "coordinator": self._node_to_dict(getattr(description, "coordinator", None)),
            },
            "members": [
                {
                    "member_id": member.member_id,
                    "client_id": member.client_id,
                    "host": member.host,
                    "assignment": [
                        self._topic_partition_to_dict(tp)
                        for tp in member.assignment.topic_partitions
                    ],
                }
                for member in description.members
            ],
            "offsets": [
                {
                    "topic": partition.topic,
                    "partition": partition.partition,
                    "committed": partition.offset,
                    "latest": latest_offsets[(partition.topic, partition.partition)],
                    "lag": None
                    if partition.offset < 0
                    or latest_offsets[(partition.topic, partition.partition)] is None
                    else max(
                        0, latest_offsets[(partition.topic, partition.partition)] - partition.offset
                    ),
                }
                for partition in committed
            ],
        }

    def _read_latest_offsets(
        self, partitions: list[TopicPartition]
    ) -> dict[tuple[str, int], int | None]:
        requests = {
            TopicPartition(tp.topic, tp.partition): OffsetSpec.latest() for tp in partitions
        }
        futures = self.admin.list_offsets(requests, request_timeout=5)
        return {
            (topic_partition.topic, topic_partition.partition): futures[topic_partition]
            .result()
            .offset
            for topic_partition in requests
        }

    def _node_to_dict(self, node: object | None) -> dict[str, object] | None:
        if node is None:
            return None

        return {
            "id": getattr(node, "id", None),
            "host": getattr(node, "host", None),
            "port": getattr(node, "port", None),
            "rack": getattr(node, "rack", None),
        }

    def _topic_to_dict(self, topic_name: str, topic_metadata: object) -> dict[str, object]:
        partitions = getattr(topic_metadata, "partitions", {})
        return {
            "name": topic_name,
            "partition_count": len(partitions),
            "partitions": [
                {
                    "partition": partition_id,
                    "leader": metadata.leader,
                    "replicas": list(metadata.replicas),
                    "isrs": list(metadata.isrs),
                }
                for partition_id, metadata in partitions.items()
            ],
        }

    def _topic_partition_to_dict(self, topic_partition: TopicPartition) -> dict[str, object]:
        return {
            "topic": topic_partition.topic,
            "partition": topic_partition.partition,
            "offset": topic_partition.offset,
        }
