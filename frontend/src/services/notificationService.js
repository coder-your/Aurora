import api from "./api";

export const listNotifications = (params = {}) => api.get("/api/notifications", { params });

export const unreadCount = () => api.get("/api/notifications/unread-count");

export const markAsRead = (id) => api.post(`/api/notifications/${id}/read`);

export const markAllAsRead = () => api.post("/api/notifications/read-all");
