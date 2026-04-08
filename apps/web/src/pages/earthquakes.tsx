import { WavesLadder } from "lucide-react";
import { useLoaderData } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <section className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <WavesLadder className="size-5 text-muted-foreground" />
            <CardTitle>全球最新地震</CardTitle>
          </div>
          <CardDescription>系统将实时接收地震数据，展示最近 7 天内的地震事件记录。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <WavesLadder className="mb-4 size-8 opacity-50" />
              <p>暂无地震事件记录</p>
              <p className="text-sm">系统正在等待并监听新的事件流...</p>
            </div>
          ) : (
            data.items.map((item) => (
              <div
                key={item.event_id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-panel-soft p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="font-medium">{item.summary}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.location?.place ?? "未知地点"}
                    {item.magnitude !== null ? ` · 震级 M${item.magnitude.toFixed(1)}` : ""}
                    {item.location?.depth_km !== null && item.location?.depth_km !== undefined
                      ? ` · 深度 ${item.location.depth_km.toFixed(1)} km`
                      : ""}
                  </div>
                </div>
                <div className="shrink-0 text-sm text-muted-foreground">
                  {formatTimestamp(item.observed_at)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
