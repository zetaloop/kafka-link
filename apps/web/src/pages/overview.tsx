import { CloudSun, LoaderCircle, ShieldAlert, WavesLadder, Wind } from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router-dom";

import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
      label: "Tracked cities",
      value: String(data.summary.city_count),
      hint: `${data.cities.length} 个城市已接入当前视图。`,
      badge: data.cities.length ? "active" : "empty",
      icon: <CloudSun className="size-5" />,
    },
    {
      label: "Live alerts",
      value: String(data.summary.alert_count),
      hint: "页面会在规则和 preset 变动后自动重拉摘要。",
      badge: data.summary.alert_count ? "hot" : "idle",
      icon: <ShieldAlert className="size-5" />,
    },
    {
      label: "Recent earthquakes",
      value: String(data.summary.earthquake_count),
      hint: "汇总自最近事件流与历史初始化结果。",
      badge: "history + live",
      icon: <WavesLadder className="size-5" />,
    },
    {
      label: "Last update",
      value: formatRelativeTimestamp(data.updated_at),
      hint: `最近一次投影种类：${data.summary.last_kind ?? "unknown"}`,
      badge: "snapshot",
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
          <EmptyState
            eyebrow="overview"
            title="当前还没有接入任何城市。"
            description="可以直接加载 demo preset，也可以手动输入城市名走 geocoding。页面骨架已经和后面的业务数据对齐。"
            action={
              <div className="flex flex-col gap-3 md:flex-row">
                <Button onClick={handleLoadPreset} disabled={submitting}>
                  {submitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                  Load demo preset
                </Button>
                <form className="flex flex-1 gap-3" onSubmit={handleCreateCity}>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                    placeholder="输入城市名，例如 Beijing"
                  />
                  <Button type="submit" variant="secondary" disabled={submitting}>
                    Add city
                  </Button>
                </form>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.cities.map((city) => (
              <Card key={city.city_id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{city.name}</CardTitle>
                      <CardDescription>
                        {[city.admin1, city.country_code].filter(Boolean).join(" · ")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDeleteCity(city.city_id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
                  <p>
                    坐标 {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span>{city.timezone ?? "timezone unknown"}</span>
                    <Button asChild size="sm">
                      <Link to={`/cities/${city.city_id}`}>Open detail</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Layout contract</CardTitle>
            <CardDescription>
              状态快照和事件流分开组织，保证业务页不会被 Kafka 监控信息挤占。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>左侧保留城市摘要卡片密度，右侧保留后续接入趋势图、事件流和空状态说明的余量。</p>
            <p>
              当前更新时间 {formatRelativeTimestamp(data.updated_at)}，摘要由 Redis
              投影视图直接驱动。
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
