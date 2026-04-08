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
          <div className="space-y-2">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-3xl">{value}</CardTitle>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl border bg-muted text-primary">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3 pt-0">
        <p className="text-sm text-muted-foreground">{hint}</p>
        <Badge variant="secondary">{badge}</Badge>
      </CardContent>
    </Card>
  );
}
