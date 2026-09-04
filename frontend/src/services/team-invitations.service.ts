import { api } from './api';
import type { InvitationPreviewResponse, TenantInvitationsResponse } from '../types/team-invitation.types';

export const teamInvitationsService = {
  listForUser() {
    return api.get<TenantInvitationsResponse>('/me/invitations');
  },
  list() {
    return api.get<TenantInvitationsResponse>('/tenant/invitations', { tenantScoped: true });
  },

  create(email: string, role: 'admin' | 'member', permissions: string[] = []) {
    return api.post('/tenant/invitations', { email, role, permissions }, { tenantScoped: true });
  },

  resend(id: number) {
    return api.post(`/tenant/invitations/${id}/resend`, undefined, { tenantScoped: true });
  },

  revoke(id: number) {
    return api.delete(`/tenant/invitations/${id}`, { tenantScoped: true });
  },

  preview(token: string) {
    return api.get<InvitationPreviewResponse>(`/invitations/${encodeURIComponent(token)}`);
  },

  accept(token: string) {
    return api.post(`/invitations/${encodeURIComponent(token)}/accept`);
  },

  reject(token: string) {
    return api.post(`/invitations/${encodeURIComponent(token)}/reject`);
  },

  acceptForUser(id: number) {
    return api.post<{ message: string; tenant_id?: number }>(`/me/invitations/${id}/accept`);
  },

  rejectForUser(id: number) {
    return api.post(`/me/invitations/${id}/reject`);
  },
};
