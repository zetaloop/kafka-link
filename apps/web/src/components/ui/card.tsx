import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
  variant?: "default" | "texture";
}) {
  const contentClassName = cn(
    "group/card flex flex-col gap-4 overflow-hidden py-4 text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0",
    variant === "texture"
      ? "rounded-[21px] bg-gradient-to-b from-card/80 to-secondary/40 dark:from-card/90 dark:to-secondary/30 *:[img:first-child]:rounded-t-[21px] *:[img:last-child]:rounded-b-[21px]"
      : "rounded-2xl bg-card ring-1 ring-foreground/10 bg-gradient-to-b from-card to-secondary/20 shadow-sm dark:shadow-md *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
    className,
  );

  const content = <div data-slot="card" data-size={size} className={contentClassName} {...props} />;

  if (variant === "texture") {
    return (
      <div className="rounded-3xl border border-white/50 dark:border-neutral-800/60 bg-gradient-to-b from-neutral-100 to-white/80 dark:from-neutral-800 dark:to-neutral-900 p-px shadow-[0_1px_1px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,252,240,0.5),inset_0_0_0_1px_rgba(255,255,255,0.1),0_0_1px_rgba(28,27,26,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),inset_0_0_0_1px_rgba(255,255,255,0.03),0_0_0_1px_rgba(0,0,0,0.1),0_2px_2px_rgba(0,0,0,0.1),0_4px_4px_rgba(0,0,0,0.1),0_8px_8px_rgba(0,0,0,0.1)]">
        <div className="rounded-[23px] border border-black/5 dark:border-white/5 p-px">
          <div className="rounded-[22px] border border-white/60 dark:border-neutral-700/40">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
