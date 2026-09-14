import { api } from './api';
import type { SupportConversation, SupportFaqCategory, SupportMessage, SupportMessagePage, SupportStatus } from '../types/support.types';

const tenantConfig = (tenantId?: number) => ({ tenantScoped: true, ...(tenantId ? { tenantId } : {}) });

export const supportService = {
  async faqs() {
    return api.get<{ data: SupportFaqCategory[] }>('/support/faqs');
  },
  async faqAnswer(slug: string) {
    return api.get<{ data: { type: string; answer: string } }>(`/support/faqs/${encodeURIComponent(slug)}`);
  },
  async faqInteraction(slug: string, tenantId?: number) {
    return api.post<{ data: SupportMessage }>('/support/conversation/faqs/' + encodeURIComponent(slug), undefined, tenantConfig(tenantId));
  },
  async conversation(tenantId?: number) {
    return api.get<{ data: SupportConversation }>('/support/conversation', tenantConfig(tenantId));
  },
  async messages(tenantId?: number, params?: { cursor?: string; limit?: number }) {
    return api.get<SupportMessagePage>('/support/conversation/messages', { ...tenantConfig(tenantId), params });
  },
  async send(message: string, tenantId?: number) {
    return api.post<{ data: SupportMessage }>('/support/conversation/messages', { message }, tenantConfig(tenantId));
  },
  async markRead(tenantId?: number) {
    return api.post('/support/conversation/read', undefined, tenantConfig(tenantId));
  },
  async status(status: SupportStatus, tenantId?: number) {
    return api.post<{ data: SupportConversation }>('/support/conversation/status/' + status, undefined, tenantConfig(tenantId));
  },
};

export const adminSupportService = {
  async list(params?: { status?: string; search?: string }) {
    return api.get<{ data: { data: SupportConversation[]; current_page: number; last_page: number } }>('/admin/support/conversations', { params });
  },
  async conversation(id: number) {
    return api.get<{ data: SupportConversation }>(`/admin/support/conversations/${id}`);
  },
  async messages(id: number, params?: { cursor?: string; limit?: number }) {
    return api.get<SupportMessagePage>(`/admin/support/conversations/${id}/messages`, { params });
  },
  async send(id: number, message: string) {
    return api.post<{ data: SupportMessage }>(`/admin/support/conversations/${id}/messages`, { message });
  },
  async markRead(id: number) {
    return api.post(`/admin/support/conversations/${id}/read`);
  },
  async status(id: number, status: SupportStatus) {
    return api.post<{ data: SupportConversation }>(`/admin/support/conversations/${id}/status/${status}`);
  },
};
