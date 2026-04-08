import { Activity, Bell, Earth, Layers3, RadioTower } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "总览", to: "/overview", icon: Activity },
  { label: "地震", to: "/earthquakes", icon: Earth },
  { label: "告警", to: "/alerts", icon: Bell },
  { label: "Kafka", to: "/kafka", icon: RadioTower },
];

export function AppSidebar() {
  return (
    <aside className="flex h-full w-full flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-lg border bg-muted px-4 py-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers3 className="size-5" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">City environment stream</div>
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
                "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
