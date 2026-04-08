import { useEffect } from "react";
import { useRevalidator } from "react-router-dom";

import type { RealtimeMessage } from "@/lib/api/types";
import { subscribeRealtime } from "@/lib/realtime/subscribe";

type UseLiveRefreshOptions = {
  intervalMs?: number;
  shouldRefresh?: (message: RealtimeMessage) => boolean;
};

export function useLiveRefresh({ intervalMs, shouldRefresh }: UseLiveRefreshOptions = {}) {
  const revalidator = useRevalidator();

  useEffect(() => {
    const unsubscribe = subscribeRealtime((message) => {
      if (!shouldRefresh || shouldRefresh(message)) {
        revalidator.revalidate();
      }
    });

    return unsubscribe;
  }, [revalidator, shouldRefresh]);

  useEffect(() => {
    if (!intervalMs) {
      return;
    }

    const timer = window.setInterval(() => {
      revalidator.revalidate();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, revalidator]);
}
