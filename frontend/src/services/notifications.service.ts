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
  category: 'security' | 'billing' | 'team' | 'organization' | 'support' | 'product' | string;
  severity: 'info' | 'success' | 'warning' | 'error' | string;
  mandatory: boolean;
  action_url: string | null;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  unread_count: number;
  categories?: string[];
  meta?: { limit: number; returned: number };
}

export async function getNotifications(limit = 20, category?: string): Promise<NotificationsResponse> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (category) query.set('category', category);
  const response = await api.get<NotificationsResponse>(`/notifications?${query.toString()}`);
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
