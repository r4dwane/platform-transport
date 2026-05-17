// src/hooks/useNotification.ts

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/constants/roles";
import { useNotificationsStore } from "@/store/notifications.store";
import { Notification } from "@/types/notification.type";

export const useNotifications = (userId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const { addNew, fetch, notifications, unreadCount, markRead, markAllRead } =
    useNotificationsStore();

  useEffect(() => {
    if (userId) {
      fetch().catch((e) => console.log("Notification fetch error:", e));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const wsBase = API_BASE_URL
      .replace("https://", "wss://")
      .replace("http://", "ws://");
    const wsUrl = `${wsBase}/ws/${userId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: true }));
        } else {
          clearInterval(ping);
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "notification") {
          const notif: Notification = {
            id: data.id, userId, type: data.type,
            title: data.title, body: data.body,
            data: data.data ?? {}, isRead: false,
            createdAt: data.createdAt,
          };
          addNew(notif);
        }
      } catch {}
    };

    ws.onclose = () => { wsRef.current = null; };

    return () => { ws.close(); };
  }, [userId]);

  return { notifications, unreadCount, markRead, markAllRead };
};