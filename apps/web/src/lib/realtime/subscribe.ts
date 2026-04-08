import type { RealtimeMessage } from "@/lib/api/types";

export function subscribeRealtime(onMessage: (message: RealtimeMessage) => void): () => void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

  socket.addEventListener("message", (event) => {
    try {
      onMessage(JSON.parse(event.data) as RealtimeMessage);
    } catch {
      return;
    }
  });

  return () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}
