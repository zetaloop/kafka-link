import { useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function CityDetailPage() {
  const { cityId = "city" } = useParams();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{cityId}</Badge>
        <Badge>snapshot layout</Badge>
        <Badge>event stream rail</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weather</CardTitle>
            <CardDescription>左侧是当前状态，右侧会接小时级趋势图。</CardDescription>
          </CardHeader>
          <CardContent className="min-h-64 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]" />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Air quality</CardTitle>
            <CardDescription>AQ 和天气使用相同骨架，只换字段，不再分叉样式。</CardDescription>
          </CardHeader>
          <CardContent className="min-h-64 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]" />
        </Card>

        <EmptyState
          eyebrow="city event rail"
          title="地震和告警会走事件流侧栏。"
          description="这块后面直接接附近地震列表和近期告警列表，当前先把尺寸和信息密度固定下来。"
        />
      </div>
    </section>
  );
}
