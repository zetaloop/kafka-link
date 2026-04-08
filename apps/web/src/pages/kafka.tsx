import { useLoaderData } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KafkaClusterData, KafkaGroupDetail, KafkaGroupListItem } from "@/lib/api/types";
import { useLiveRefresh } from "@/lib/realtime/use-live-refresh";

type KafkaLoaderData = {
  cluster: KafkaClusterData;
  groups: KafkaGroupListItem[];
  details: KafkaGroupDetail[];
};

export function KafkaPage() {
  const { cluster, groups, details } = useLoaderData() as KafkaLoaderData;

  useLiveRefresh({ intervalMs: 10000 });

  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Broker</CardTitle>
          <CardDescription>当前连接的 cluster {cluster.cluster_id ?? "unknown"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cluster.brokers.map((broker) => (
            <div
              key={broker.id ?? `${broker.host}:${broker.port}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm"
            >
              broker {broker.id} · {broker.host}:{broker.port}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic</CardTitle>
          <CardDescription>系统中各业务 Topic 的分区状态与布局。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {cluster.topics.map((topic) => (
            <div
              key={topic.name}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"
            >
              <div className="font-medium">{topic.name}</div>
              <div className="mt-2 text-[var(--muted-foreground)]">
                {topic.partition_count} partitions
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consumer Group</CardTitle>
          <CardDescription>所有 Consumer Group 的消费状态与 Lag 积压。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {groups.map((group) => {
            const detail = details.find((item) => item.group.group_id === group.group_id);
            const totalLag =
              detail?.offsets.reduce((sum, offset) => sum + (offset.lag ?? 0), 0) ?? 0;
            return (
              <div
                key={group.group_id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"
              >
                <div className="font-medium">{group.group_id}</div>
                <div className="mt-2 text-[var(--muted-foreground)]">
                  {group.state ?? "unknown"} · lag {totalLag}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
