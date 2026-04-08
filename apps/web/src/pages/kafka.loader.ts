import { fetchKafkaCluster, fetchKafkaGroup, fetchKafkaGroups } from "@/lib/api/client";

export async function kafkaLoader() {
  const [cluster, groupsResponse] = await Promise.all([fetchKafkaCluster(), fetchKafkaGroups()]);
  const groups = groupsResponse.items;
  const details = await Promise.all(groups.map((group) => fetchKafkaGroup(group.group_id)));

  return {
    cluster,
    groups,
    details,
  };
}
