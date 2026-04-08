import { CloudSun, LoaderCircle, ShieldAlert, WavesLadder, Wind } from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router-dom";

import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCity, deleteCity, loadDemoPreset } from "@/lib/api/client";
import type { OverviewData } from "@/lib/api/types";
import { useLiveRefresh } from "@/lib/realtime/use-live-refresh";

function formatRelativeTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OverviewPage() {
  const data = useLoaderData() as OverviewData;
  const revalidator = useRevalidator();
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useLiveRefresh({
    intervalMs: 15000,
    shouldRefresh(message) {
      return (
        message.type === "overview.updated" ||
        message.type === "preset.loaded" ||
        message.type === "city.upserted" ||
        message.type === "city.deleted" ||
        message.type === "rule.upserted" ||
        message.type === "rule.deleted"
      );
    },
  });

  const cards = [
    {
      label: "追踪城市",
      value: String(data.summary.city_count),
      hint: `当前视图已接入 ${data.cities.length} 个城市`,
      badge: data.cities.length ? "活跃" : "空",
      icon: <CloudSun className="size-5" />,
    },
    {
      label: "实时告警",
      value: String(data.summary.alert_count),
      hint: "基于系统当前配置的规则生成",
      badge: data.summary.alert_count ? "触发中" : "平静",
      icon: <ShieldAlert className="size-5" />,
    },
    {
      label: "近期地震",
      value: String(data.summary.earthquake_count),
      hint: "实时事件流与历史数据汇总",
      badge: "持续监听",
      icon: <WavesLadder className="size-5" />,
    },
    {
      label: "最后更新",
      value: formatRelativeTimestamp(data.updated_at),
      hint: "视图数据的最后刷新时间",
      badge: "快照",
      icon: <Wind className="size-5" />,
    },
  ];

  async function handleLoadPreset() {
    setSubmitting(true);
    try {
      await loadDemoPreset();
      revalidator.revalidate();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await createCity(query.trim());
      setQuery("");
      revalidator.revalidate();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCity(cityId: string) {
    setSubmitting(true);
    try {
      await deleteCity(cityId);
      revalidator.revalidate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        {data.cities.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CloudSun className="mb-4 size-10 text-muted-foreground opacity-50" />
            <h3 className="mb-2 text-lg font-medium">暂无城市数据</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              当前尚未接入任何城市，您可以加载系统默认预设，或者手动输入城市名进行添加。
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Button onClick={handleLoadPreset} disabled={submitting}>
                {submitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                加载预设
              </Button>
              <form className="flex items-center gap-2" onSubmit={handleCreateCity}>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-48"
                  placeholder="输入城市名 (如 Beijing)"
                  disabled={submitting}
                />
                <Button type="submit" variant="secondary" disabled={submitting}>
                  添加城市
                </Button>
              </form>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">已接入城市</h2>
              <form className="flex items-center gap-2" onSubmit={handleCreateCity}>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-8 w-40 text-sm"
                  placeholder="输入城市名"
                  disabled={submitting}
                />
                <Button type="submit" size="sm" variant="secondary" disabled={submitting}>
                  添加城市
                </Button>
              </form>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.cities.map((city) => (
                <Card key={city.city_id} className="transition-colors hover:border-border-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{city.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {[city.admin1, city.country_code].filter(Boolean).join(" · ")}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDeleteCity(city.city_id)}
                        disabled={submitting}
                      >
                        删除
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between rounded-md bg-panel-soft px-3 py-2">
                      <span className="truncate">
                        {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
                      </span>
                      <span className="shrink-0">{city.timezone ?? "未知时区"}</span>
                    </div>
                    <div className="pt-1">
                      <Button asChild variant="secondary" className="w-full">
                        <Link to={`/cities/${city.city_id}`}>查看详情</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
