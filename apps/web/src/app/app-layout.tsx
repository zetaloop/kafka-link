import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-5 px-4 py-5 md:px-6 lg:px-8">
        <div className="hidden w-[292px] shrink-0 lg:block">
          <AppSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="flex h-16 items-center justify-between rounded-xl border bg-card px-5 shadow-sm">
            <h1 className="text-xl font-semibold tracking-tight">Kafka Link</h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
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
