import { CloudSun, ShieldAlert, WavesLadder, Wind } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const cards = [
  {
    label: "Tracked cities",
    value: "0",
    hint: "默认空状态，后续由 preset 或城市管理接口注入。",
    badge: "waiting",
    icon: <CloudSun className="size-5" />,
  },
  {
    label: "Live alerts",
    value: "0",
    hint: "告警列表会在规则引擎与 WebSocket 接入后自动增量刷新。",
    badge: "planned",
    icon: <ShieldAlert className="size-5" />,
  },
  {
    label: "Recent earthquakes",
    value: "0",
    hint: "会同时容纳最近 7 天历史事件和实时新增事件。",
    badge: "history + live",
    icon: <WavesLadder className="size-5" />,
  },
  {
    label: "Weather cadence",
    value: "1h",
    hint: "快照类页面后续统一用最后更新时间来表达数据节奏。",
    badge: "snapshot",
    icon: <Wind className="size-5" />,
  },
];

export function OverviewPage() {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <EmptyState
          eyebrow="overview"
          title="城市卡片网格已经预留好了。"
          description="接下来只需要把 Overview 的 Redis 聚合结果接上来，就能直接填充天气、AQI、地震摘要和告警计数，不需要重新拆布局。"
        />

        <Card>
          <CardHeader>
            <CardTitle>Layout contract</CardTitle>
            <CardDescription>
              状态快照和事件流分开组织，保证业务页不会被 Kafka 监控信息挤占。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>左侧保留城市摘要卡片密度，右侧保留后续接入趋势图、事件流和空状态说明的余量。</p>
            <p>当还没有任何城市时，页面直接提示用户加载 preset 或手动添加城市。</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
