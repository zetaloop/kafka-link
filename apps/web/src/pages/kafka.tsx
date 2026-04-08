import { useLoaderData } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
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
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Cluster Overview</CardTitle>
          <CardDescription>当前连接的 Kafka 集群运行状态与控制器信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="mr-2 text-muted-foreground">Cluster ID:</span>
              <span className="font-mono font-medium">{cluster.cluster_id ?? "unknown"}</span>
            </div>
            <div>
              <span className="mr-2 text-muted-foreground">Controller:</span>
              <span className="font-mono">
                {cluster.controller
                  ? `${cluster.controller.id} (${cluster.controller.host}:${cluster.controller.port})`
                  : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brokers</CardTitle>
          <CardDescription>集群节点信息与网络配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cluster.brokers.map((broker) => (
              <div
                key={broker.id ?? `${broker.host}:${broker.port}`}
                className="space-y-1 rounded-2xl border border-border bg-panel-soft p-4 text-sm"
              >
                <div className="text-base font-medium">Broker {broker.id}</div>
                <div className="font-mono text-muted-foreground">
                  {broker.host}:{broker.port}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Rack: {broker.rack ?? "—"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <CardDescription>业务主题、分区数及副本状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cluster.topics.map((topic) => (
            <div
              key={topic.name}
              className="rounded-2xl border border-border bg-panel-soft p-4 text-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-medium">{topic.name}</div>
                <Badge variant="outline" className="font-mono">
                  {topic.partition_count} partitions
                </Badge>
              </div>

              {topic.partitions.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    View Partitions
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-4 gap-2 border-b border-border/50 pb-1 text-xs font-medium text-muted-foreground">
                      <div>Partition</div>
                      <div>Leader</div>
                      <div>Replicas</div>
                      <div>ISRs</div>
                    </div>
                    {topic.partitions.map((p) => (
                      <div
                        key={p.partition}
                        className="grid grid-cols-4 items-center gap-2 font-mono text-xs"
                      >
                        <div>{p.partition}</div>
                        <div>{p.leader ?? "—"}</div>
                        <div className="truncate" title={p.replicas.join(", ")}>
                          {p.replicas.join(", ")}
                        </div>
                        <div className="truncate" title={p.isrs.join(", ")}>
                          {p.isrs.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consumer Groups</CardTitle>
          <CardDescription>消费组订阅状态、成员分布及积压（Lag）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.map((group) => {
            const detail = details.find((item) => item.group.group_id === group.group_id);
            if (!detail) return null;

            return (
              <div
                key={group.group_id}
                className="rounded-2xl border border-border bg-panel-soft p-4 text-sm"
              >
                <div className="mb-4 flex flex-col gap-2 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium">{group.group_id}</span>
                    <Badge variant="secondary">{detail.group.state ?? "unknown"}</Badge>
                    {detail.group.type && <Badge variant="outline">{detail.group.type}</Badge>}
                  </div>
                  <div className="flex gap-4 font-mono text-xs text-muted-foreground">
                    <div>Assignor: {detail.group.partition_assignor ?? "—"}</div>
                    <div>
                      Coordinator:{" "}
                      {detail.group.coordinator
                        ? `${detail.group.coordinator.host}:${detail.group.coordinator.port}`
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="mb-3 font-medium text-muted-foreground">
                      Members ({detail.members.length})
                    </div>
                    {detail.members.length === 0 ? (
                      <div className="text-xs italic text-muted-foreground">No active members</div>
                    ) : (
                      <div className="space-y-3">
                        {detail.members.map((m) => (
                          <div
                            key={m.member_id}
                            className="space-y-2 rounded-xl border border-border/50 bg-background/50 p-3"
                          >
                            <div className="flex flex-col gap-1 text-xs">
                              <span
                                className="truncate font-mono text-muted-foreground"
                                title={m.member_id}
                              >
                                {m.member_id}
                              </span>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{m.client_id}</span>
                                <span className="font-mono">{m.host}</span>
                              </div>
                            </div>
                            {m.assignment.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/30 pt-2 font-mono text-xs text-muted-foreground">
                                {m.assignment.map((a) => (
                                  <span
                                    key={`${a.topic}-${a.partition}`}
                                    className="rounded-md bg-secondary/50 px-1.5 py-0.5"
                                  >
                                    {a.topic}:{a.partition}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-3 font-medium text-muted-foreground">Offsets</div>
                    {detail.offsets.length === 0 ? (
                      <div className="text-xs italic text-muted-foreground">No offset data</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-5 gap-2 border-b border-border/50 pb-1 text-xs font-medium text-muted-foreground">
                          <div className="col-span-2">Topic</div>
                          <div>Part</div>
                          <div>Comm/Lat</div>
                          <div className="text-right">Lag</div>
                        </div>
                        {detail.offsets.map((o) => {
                          const lagValue = o.lag ?? 0;
                          const hasLag = lagValue > 0;
                          return (
                            <div
                              key={`${o.topic}-${o.partition}`}
                              className="grid grid-cols-5 items-center gap-2 py-1 font-mono text-xs"
                            >
                              <div className="col-span-2 truncate" title={o.topic}>
                                {o.topic}
                              </div>
                              <div>{o.partition}</div>
                              <div className="text-muted-foreground">
                                {o.committed}/{o.latest ?? "—"}
                              </div>
                              <div
                                className={`text-right font-medium ${
                                  hasLag ? "text-chart-3" : "text-muted-foreground"
                                }`}
                              >
                                {o.lag ?? "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
