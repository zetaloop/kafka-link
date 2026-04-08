import { Activity, Bell, Building2, Earth, Layers3, RadioTower, Server } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", to: "/overview", icon: Activity },
  { label: "City Detail", to: "/cities/demo-city", icon: Building2 },
  { label: "Earthquakes", to: "/earthquakes", icon: Earth },
  { label: "Alerts", to: "/alerts", icon: Bell },
  { label: "Kafka", to: "/kafka", icon: RadioTower },
];

export function AppSidebar() {
  return (
    <aside className="flex h-full w-full flex-col rounded-[28px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--panel)_92%,black)] p-4 shadow-[0_24px_80px_rgba(2,4,12,0.32)]">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]">
          <Layers3 className="size-5" />
        </div>
        <div>
          <div className="text-sm text-[var(--muted-foreground)]">City environment stream</div>
          <div className="text-lg font-semibold tracking-tight">kafka-link</div>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                isActive
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]",
              )
            }
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,178,169,0.14),rgba(17,178,169,0.04))] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <Server className="size-4 text-[var(--accent)]" />
          Runtime split
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          业务视图和 Kafka 视图分栏组织，后续直接接入 API 与 WebSocket，不需要返工导航层。
        </p>
      </div>
    </aside>
  );
}
