import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function EarthquakesPage() {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <EmptyState
        eyebrow="earthquakes"
        title="这里会同时容纳历史和实时地震流。"
        description="启动时先显示最近 7 天事件，后续由 collector 持续推入新增地震。页面结构已经按时间倒序列表预留。"
      />

      <Card>
        <CardHeader>
          <CardTitle>Display contract</CardTitle>
          <CardDescription>保留地点、震级、深度、时间与关联城市字段。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7 text-[var(--muted-foreground)]">
          <p>事件列表不做地图化，避免把项目拖向 GIS 工具。</p>
          <p>卡片密度已经对齐到 Overview 和 Alerts，后续不会风格漂移。</p>
        </CardContent>
      </Card>
    </section>
  );
}
