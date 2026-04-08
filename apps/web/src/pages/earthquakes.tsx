import { useLoaderData } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { EarthquakeResponse } from "@/lib/api/types";
import { useLiveRefresh } from "@/lib/realtime/use-live-refresh";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EarthquakesPage() {
  const data = useLoaderData() as EarthquakeResponse;

  useLiveRefresh({
    intervalMs: 15000,
    shouldRefresh(message) {
      return message.type === "earthquakes.updated" || message.type === "overview.updated";
    },
  });

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Recent earthquakes</CardTitle>
          <CardDescription>最近 7 天历史 + 新进入的实时地震事件都会出现在这里。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <EmptyState
              eyebrow="earthquakes"
              title="当前还没有地震事件。"
              description="collector 完成初始拉取后，这里会开始按时间倒序填充。"
            />
          ) : (
            data.items.map((item) => (
              <div
                key={item.event_id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium">{item.summary}</div>
                  <div className="text-[var(--muted-foreground)]">
                    {formatTimestamp(item.observed_at)}
                  </div>
                </div>
                <div className="mt-2 text-[var(--muted-foreground)]">
                  {item.location?.place ?? "Unknown location"}
                  {item.magnitude !== null ? ` · M${item.magnitude.toFixed(1)}` : ""}
                  {item.location?.depth_km !== null && item.location?.depth_km !== undefined
                    ? ` · ${item.location.depth_km.toFixed(1)} km`
                    : ""}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
