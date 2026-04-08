import { useLoaderData } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CityDetailData, CitySnapshotItem } from "@/lib/api/types";
import { useLiveRefresh } from "@/lib/realtime/use-live-refresh";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildChartData(items: CitySnapshotItem[], metric: string) {
  return items.map((item) => ({
    label: formatTime(item.observed_at),
    value: item.metrics[metric] ?? null,
  }));
}

export function CityDetailPage() {
  const data = useLoaderData() as CityDetailData;

  useLiveRefresh({
    intervalMs: 15000,
    shouldRefresh(message) {
      return (
        (message.type === "city.snapshot.updated" && message.city_id === data.city?.city_id) ||
        (message.type === "alert.new" && message.city_id === data.city?.city_id) ||
        (message.type === "alert.feed.updated" && message.city_id === data.city?.city_id) ||
        message.type === "preset.loaded" ||
        message.type === "city.upserted" ||
        message.type === "city.deleted" ||
        message.type === "rule.upserted" ||
        message.type === "rule.deleted"
      );
    },
  });

  if (!data.city) {
    return (
      <EmptyState
        eyebrow="city detail"
        title="这个城市当前还没有详情数据。"
        description="可以先回到总览页加载 preset，或者添加一个新城市后再进入详情。"
      />
    );
  }

  const weatherPoints = buildChartData(data.weather_history, "temperature_c");
  const airPoints = buildChartData(data.airquality_history, "aqi_us");

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{data.city.name}</Badge>
        <Badge>{data.city.country_code}</Badge>
        <Badge>{data.city.timezone ?? "timezone unknown"}</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weather</CardTitle>
            <CardDescription>
              {data.latest?.weather?.summary ?? "当前还没有天气快照。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-semibold">
              {data.latest?.weather?.metrics.temperature_c?.toFixed(1) ?? "--"}
              <span className="ml-2 text-base text-[var(--muted-foreground)]">°C</span>
            </div>
            <div className="h-52 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weatherPoints}>
                  <XAxis dataKey="label" stroke="#91a0bc" />
                  <YAxis stroke="#91a0bc" />
                  <Tooltip />
                  <Line dataKey="value" stroke="#11b2a9" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Air quality</CardTitle>
            <CardDescription>
              {data.latest?.airquality?.summary ?? "当前还没有 AQ 快照。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-semibold">
              {data.latest?.airquality?.metrics.aqi_us?.toFixed(0) ?? "--"}
              <span className="ml-2 text-base text-[var(--muted-foreground)]">AQI</span>
            </div>
            <div className="h-52 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={airPoints}>
                  <XAxis dataKey="label" stroke="#91a0bc" />
                  <YAxis stroke="#91a0bc" />
                  <Tooltip />
                  <Line dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent alerts</CardTitle>
            <CardDescription>这里显示当前城市最近命中的规则事件。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.length === 0 ? (
              <EmptyState
                eyebrow="event rail"
                title="还没有关联到这个城市的告警。"
                description="后续命中规则后，列表会按时间倒序追加。"
              />
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.event_id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm"
                >
                  <div className="font-medium">{alert.summary}</div>
                  <div className="mt-2 text-[var(--muted-foreground)]">
                    {alert.metric}: {alert.actual_value} / {alert.threshold}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
