import asyncio
import json
from dataclasses import dataclass, field
from typing import Protocol

from confluent_kafka import Consumer, Producer
from redis.asyncio import Redis

from kafka_link_shared.models import AlertEvent, AlertRule, NormalizedEvent
from kafka_link_shared.settings import RedisKeys, ServiceSettings, utc_now
from kafka_link_shared.topics import ALERTS_TOPIC, CONSUMER_GROUP_ALERTING, NORMALIZED_EVENTS_TOPIC


class ProducerLike(Protocol):
    def produce(self, topic: str, value: str, key: str | None = None) -> None: ...

    def poll(self, timeout: float) -> None: ...

    def flush(self, timeout: float | None = None) -> int: ...


class ConsumerLike(Protocol):
    def subscribe(self, topics: list[str]) -> None: ...

    def poll(self, timeout: float): ...

    def close(self) -> None: ...


@dataclass(slots=True)
class AlertEngine:
    settings: ServiceSettings
    redis: Redis
    consumer: ConsumerLike
    producer: ProducerLike
    seen_alerts: set[str] = field(default_factory=set)

    async def process_message(self, payload: str) -> list[AlertEvent]:
        event = NormalizedEvent.model_validate_json(payload)
        rules = await self._load_rules()
        alerts: list[AlertEvent] = []

        for rule in rules:
            if not rule.enabled or rule.source.value != event.kind.value:
                continue
            if rule.city_id not in event.city_ids:
                continue

            metric_name = rule.metric.value
            actual_value = event.metrics.get(metric_name)
            if actual_value is None or not rule.operator.compare(actual_value, rule.threshold):
                continue

            dedupe_key = f"{rule.rule_id}:{event.event_id}"
            if dedupe_key in self.seen_alerts:
                continue
            if not await self._reserve_alert(dedupe_key):
                continue

            alerts.append(
                AlertEvent(
                    event_id=f"alert:{rule.rule_id}:{event.event_id}",
                    rule_id=rule.rule_id,
                    city_id=rule.city_id,
                    metric=metric_name,
                    actual_value=actual_value,
                    threshold=rule.threshold,
                    source_event_id=event.event_id,
                    triggered_at=utc_now(),
                    summary=f"{rule.name} hit with {metric_name}={actual_value:.1f}",
                )
            )
            self.seen_alerts.add(dedupe_key)

        return alerts

    async def handle_message(self, payload: str) -> int:
        alerts = await self.process_message(payload)
        for alert in alerts:
            self.producer.produce(ALERTS_TOPIC, key=alert.city_id, value=alert.model_dump_json())
            self.producer.poll(0)
            await self.redis.publish(
                RedisKeys.websocket_channel(),
                json.dumps(
                    {
                        "type": "alert.new",
                        "city_id": alert.city_id,
                        "rule_id": alert.rule_id,
                        "event_id": alert.event_id,
                    }
                ),
            )
        return len(alerts)

    async def run_forever(self) -> None:
        self.consumer.subscribe([NORMALIZED_EVENTS_TOPIC])

        while True:
            message = self.consumer.poll(1.0)
            if message is None or message.error() is not None:
                await asyncio.sleep(0)
                continue

            await self.handle_message(message.value().decode("utf-8"))

    async def _load_rules(self) -> list[AlertRule]:
        rule_ids = sorted(await self.redis.smembers("rules:index"))
        if not rule_ids:
            return []

        items = await self.redis.mget([f"rule:{rule_id}" for rule_id in rule_ids])
        return [AlertRule.model_validate_json(item) for item in items if item]

    async def _reserve_alert(self, dedupe_key: str) -> bool:
        return bool(await self.redis.set(f"alert:dedupe:{dedupe_key}", "1", ex=86400, nx=True))


async def _main() -> None:
    settings = ServiceSettings.from_env("alert-engine")
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    consumer = Consumer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "broker.address.family": "v4",
            "group.id": CONSUMER_GROUP_ALERTING,
            "auto.offset.reset": "earliest",
        }
    )
    producer = Producer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "broker.address.family": "v4",
            "client.id": settings.service_name,
        }
    )
    engine = AlertEngine(settings, redis, consumer, producer)

    try:
        await engine.run_forever()
    finally:
        consumer.close()
        await redis.aclose()
        producer.flush(5.0)


def main() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    main()
