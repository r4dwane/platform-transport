import api from "./api";
import { Notification } from "@/types/notification.type";

 
export const notificationsService = {
  getAll: (unread_only = false) =>
    api.get<{ notifications: Notification[] }>("/api/v1/notifications", {
      params: { unread_only },
    }),
 
  markRead: (id: string) =>
    api.post(`/api/v1/notifications/${id}/read`),
 
  markAllRead: () =>
    api.post("/api/v1/notifications/read-all"),
};