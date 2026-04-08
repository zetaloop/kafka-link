import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function AlertsPage() {
  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rule management</CardTitle>
            <CardDescription>规则表单、规则列表和启停操作会放在这侧。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-5 text-sm text-[var(--muted-foreground)]">
              后续接入天气、AQ、地震阈值规则，不做通用 DSL 编辑器。
            </div>
            <Button variant="secondary">Create rule</Button>
          </CardContent>
        </Card>

        <EmptyState
          eyebrow="alert history"
          title="命中记录会按事件流方式展示。"
          description="右侧区域后续展示触发时间、规则、实际值、来源城市和来源事件，和地震页保持统一的事件节奏。"
        />
      </div>
    </section>
  );
}
