import { useEffect, useRef } from "react";
import { ENDPOINTS } from "@/constants/api";
import { useNotificationsStore } from "@/store/notifications.store";
import { Notification } from "@/types/models.types";
 
export const useNotifications = (userId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const { addNew, fetch, notifications, unreadCount, markRead, markAllRead } =
    useNotificationsStore();
 
  // Fetch existing notifications on mount
  useEffect(() => {
    if (userId) fetch();
  }, [userId]);
 
  // Open WebSocket for live pushes
  useEffect(() => {
    if (!userId) return;
 
    const ws = new WebSocket(ENDPOINTS.ws(userId));
    wsRef.current = ws;
 
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "notification") {
          const notif: Notification = {
            id:        data.id,
            userId:    userId,
            type:      data.type,
            title:     data.title,
            body:      data.body,
            data:      data.data ?? {},
            isRead:    false,
            createdAt: data.createdAt,
          };
          addNew(notif);
        }
      } catch {}
    };
 
    ws.onopen  = () => {
      // Keep connection alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: true }));
        } else {
          clearInterval(ping);
        }
      }, 30000);
    };
 
    ws.onclose = () => console.log("🔔 Notification WS disconnected");
 
    return () => {
      ws.close();
    };
  }, [userId]);
 
  return { notifications, unreadCount, markRead, markAllRead };
};