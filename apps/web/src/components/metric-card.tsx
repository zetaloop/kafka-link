import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  badge: string;
  icon: ReactNode;
};

export function MetricCard({ label, value, hint, badge, icon }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--accent)]">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3 pt-0">
        <p className="text-sm text-[var(--muted-foreground)]">{hint}</p>
        <Badge>{badge}</Badge>
      </CardContent>
    </Card>
  );
}
