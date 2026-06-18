import { api } from './api';
import type {
  ContactMessage,
  ContactMessageStatus,
  PaginatedContactMessages,
} from '../types/contact-message.types';

interface ContactMessageListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const adminContactMessagesService = {
  list(params: ContactMessageListParams) {
    return api.get<PaginatedContactMessages>('/admin/contact-messages', { params });
  },

  get(id: number) {
    return api.get<ContactMessage>(`/admin/contact-messages/${id}`);
  },

  updateStatus(id: number, status: ContactMessageStatus) {
    return api.put<ContactMessage>(`/admin/contact-messages/${id}/status`, { status });
  },

  delete(id: number) {
    return api.delete(`/admin/contact-messages/${id}`);
  },
};
