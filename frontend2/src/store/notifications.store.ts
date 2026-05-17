import { create } from "zustand";
import { Notification } from "@/types/notification.type";
import { notificationsService } from "@/services/notifications";
 
interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNew: (notif: Notification) => void; // called from WebSocket
}
 
export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
 
  fetch: async () => {
    const { data } = await notificationsService.getAll();
    const unread = data.notifications.filter((n) => !n.isRead).length;
    set({ notifications: data.notifications, unreadCount: unread });
  },
 
  markRead: async (id) => {
    await notificationsService.markRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
 
  markAllRead: async () => {
    await notificationsService.markAllRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
 
  addNew: (notif) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));