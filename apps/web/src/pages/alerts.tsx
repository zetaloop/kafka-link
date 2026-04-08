import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createRule, deleteRule } from "@/lib/api/client";
import type { AlertFeedItem, CityRecord, RuleRecord } from "@/lib/api/types";
import { useLiveRefresh } from "@/lib/realtime/use-live-refresh";

type AlertsLoaderData = {
  alerts: AlertFeedItem[];
  rules: RuleRecord[];
  cities: CityRecord[];
};

export function AlertsPage() {
  const { alerts, rules, cities } = useLoaderData() as AlertsLoaderData;
  const revalidator = useRevalidator();
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    city_id: cities[0]?.city_id ?? "",
    source: "weather" as RuleRecord["source"],
    metric: "temperature_c" as RuleRecord["metric"],
    operator: "gte" as RuleRecord["operator"],
    threshold: "30",
  });

  useLiveRefresh({
    intervalMs: 10000,
    shouldRefresh(message) {
      return (
        message.type === "preset.loaded" ||
        message.type === "alert.new" ||
        message.type === "alert.feed.updated" ||
        message.type.startsWith("rule.") ||
        message.type.startsWith("city.")
      );
    },
  });

  const metricOptions = useMemo(() => {
    if (formState.source === "weather") {
      return [{ label: "temperature_c", value: "temperature_c" }];
    }
    if (formState.source === "airquality") {
      return [
        { label: "aqi_us", value: "aqi_us" },
        { label: "pm2_5", value: "pm2_5" },
      ];
    }
    return [{ label: "earthquake_magnitude", value: "earthquake_magnitude" }];
  }, [formState.source]);

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formState.city_id || !formState.name.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await createRule({
        name: formState.name.trim(),
        city_id: formState.city_id,
        source: formState.source,
        metric: formState.metric,
        operator: formState.operator,
        threshold: Number(formState.threshold),
        enabled: true,
      });
      setFormState((current) => ({ ...current, name: "" }));
      revalidator.revalidate();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    setSubmitting(true);
    try {
      await deleteRule(ruleId);
      revalidator.revalidate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>规则管理</CardTitle>
            <CardDescription>在此处创建和管理您的告警规则。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={handleCreateRule}>
              <div className="space-y-1">
                <div className="text-xs text-[var(--muted-foreground)]">规则名称</div>
                <input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                  placeholder="请输入规则名称"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-[var(--muted-foreground)]">城市</div>
                  <select
                    value={formState.city_id}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, city_id: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                  >
                    {cities.map((city) => (
                      <option key={city.city_id} value={city.city_id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-[var(--muted-foreground)]">数据源</div>
                  <select
                    value={formState.source}
                    onChange={(event) => {
                      const source = event.target.value as RuleRecord["source"];
                      const nextMetric =
                        source === "weather"
                          ? "temperature_c"
                          : source === "airquality"
                            ? "aqi_us"
                            : "earthquake_magnitude";
                      setFormState((current) => ({ ...current, source, metric: nextMetric }));
                    }}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                  >
                    <option value="weather">天气</option>
                    <option value="airquality">空气质量</option>
                    <option value="earthquake">地震</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-[var(--muted-foreground)]">指标</div>
                  <select
                    value={formState.metric}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        metric: event.target.value as RuleRecord["metric"],
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                  >
                    {metricOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-[var(--muted-foreground)]">运算符</div>
                  <select
                    value={formState.operator}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        operator: event.target.value as RuleRecord["operator"],
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                  >
                    <option value="gt">&gt;</option>
                    <option value="gte">&gt;=</option>
                    <option value="lt">&lt;</option>
                    <option value="lte">&lt;=</option>
                    <option value="eq">==</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-[var(--muted-foreground)]">阈值</div>
                  <input
                    value={formState.threshold}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, threshold: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                    placeholder="请输入阈值"
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                type="submit"
                disabled={submitting || cities.length === 0}
              >
                创建规则
              </Button>
            </form>

            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="mt-1 text-[var(--muted-foreground)]">
                        {rule.source} · {rule.metric} {rule.operator} {rule.threshold}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDeleteRule(rule.rule_id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>告警历史</CardTitle>
            <CardDescription>按时间倒序显示规则命中记录。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <EmptyState
                eyebrow="告警历史"
                title="当前还没有告警记录。"
                description="规则命中后，这里会直接显示 metric、阈值、实际值和来源事件。"
              />
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.event_id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm"
                >
                  <div className="font-medium">{alert.summary}</div>
                  <div className="mt-2 text-[var(--muted-foreground)]">
                    {alert.city_id} · {alert.metric}: {alert.actual_value} / {alert.threshold}
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
