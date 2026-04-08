import { Bell, Clock3, Radio, Search } from "lucide-react";
import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(17,178,169,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_20%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-5 px-4 py-5 md:px-6 lg:px-8">
        <div className="hidden w-[292px] shrink-0 lg:block">
          <AppSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--panel)_88%,black)] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                Local demo stack
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Kafka-backed city intelligence dashboard
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                <Search className="size-4" />
                Search cities, rules, topics
              </div>
              <Badge className="gap-2 text-[var(--foreground)]">
                <Radio className="size-3.5 text-[var(--accent)]" />
                live routes planned
              </Badge>
              <Badge className="gap-2 text-[var(--foreground)]">
                <Clock3 className="size-3.5" />
                single-user local mode
              </Badge>
              <div className="flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-foreground)]">
                <Bell className="size-4" />
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-11rem)]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
