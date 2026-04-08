import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ eyebrow, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-[linear-gradient(180deg,rgba(20,26,44,0.9),rgba(12,18,31,0.78))]">
      <CardHeader>
        <span className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</span>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="max-w-xl text-base leading-7">{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
