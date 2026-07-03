import { api } from './api';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  data: {
    payment_id?: number;
    refund_id?: number;
    amount?: number;
    currency?: string;
    status?: string;
  } | null;
  read_at: string | null;
  created_at: string;
  is_read: boolean;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  unread_count: number;
}

export async function getNotifications(limit = 20): Promise<NotificationsResponse> {
  const response = await api.get<NotificationsResponse>(`/notifications?limit=${limit}`);
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ unread_count: number }>('/notifications/unread-count');
  return response.data.unread_count;
}

export async function markAsRead(notificationId: number): Promise<void> {
  await api.post(`/notifications/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<{ message: string; marked_count: number }> {
  const response = await api.post<{ message: string; marked_count: number }>('/notifications/read-all');
  return response.data;
}