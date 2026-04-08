import { useLoaderData } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-panel-soft p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          城市详情
        </div>
        <div className="text-lg font-medium">这个城市当前还没有详情数据。</div>
        <div className="mt-2 text-sm text-muted-foreground">
          可以先回到总览页加载 preset，或者添加一个新城市后再进入详情。
        </div>
      </div>
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
            <CardTitle>天气</CardTitle>
            <CardDescription>
              {data.latest?.weather?.summary ?? "当前还没有天气快照。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-semibold">
              {data.latest?.weather?.metrics.temperature_c?.toFixed(1) ?? "--"}
              <span className="ml-2 text-base text-muted-foreground">°C</span>
            </div>
            <div className="h-52 rounded-2xl border border-dashed border-border bg-panel-soft p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">趋势图</div>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={weatherPoints}>
                  <XAxis
                    dataKey="label"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--panel)",
                    }}
                  />
                  <Line dataKey="value" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>空气质量</CardTitle>
            <CardDescription>
              {data.latest?.airquality?.summary ?? "当前还没有 AQ 快照。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-semibold">
              {data.latest?.airquality?.metrics.aqi_us?.toFixed(0) ?? "--"}
              <span className="ml-2 text-base text-muted-foreground">AQI</span>
            </div>
            <div className="h-52 rounded-2xl border border-dashed border-border bg-panel-soft p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">趋势图</div>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={airPoints}>
                  <XAxis
                    dataKey="label"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--panel)",
                    }}
                  />
                  <Line dataKey="value" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>附近地震</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {data.earthquakes?.length ? (
                  data.earthquakes.map((item) => (
                    <div
                      key={item.event_id}
                      className="rounded-2xl border border-border bg-panel-soft p-4 text-sm"
                    >
                      <div className="font-medium">{item.summary}</div>
                      <div className="mt-2 text-muted-foreground">
                        {item.location?.place ?? "Unknown location"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-panel-soft p-4 text-sm text-muted-foreground">
                    当前没有关联到这个城市的地震事件。
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近告警</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {data.alerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-panel-soft p-4 text-sm text-muted-foreground">
                    当前还没有关联到这个城市的告警。
                  </div>
                ) : (
                  data.alerts.map((alert) => (
                    <div
                      key={alert.event_id}
                      className="rounded-2xl border border-border bg-panel-soft p-4 text-sm"
                    >
                      <div className="font-medium">{alert.summary}</div>
                      <div className="mt-2 text-muted-foreground">
                        {alert.metric}: {alert.actual_value} / {alert.threshold}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
