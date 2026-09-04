import { api } from './api';
import type { TenantListResponse, TenantResponse } from '../types/tenant.types';

export const tenantService = {
  list() {
    return api.get<TenantListResponse>('/tenants');
  },

  create(data: { name: string; industry: string; website: string; contact_email: string; description?: string }) {
    return api.post<TenantResponse>('/tenants', data);
  },

  get(id: number) {
    // The URL identifies this tenant; tenant-scoped data endpoints use tenantScoped.
    return api.get<TenantResponse>(`/tenants/${id}`);
  },

  destroy(id: number) {
    return api.delete<{ message: string }>(`/tenants/${id}`, { tenantScoped: true });
  },

  setPrimary(id: number) {
    return api.post<{ message: string }>(`/tenants/${id}/primary`, {}, { tenantScoped: true });
  },

  scheduleDeletion(id: number, organizationName: string) {
    return api.post<{ message: string; deletes_at?: string }>(`/tenants/${id}/schedule-deletion`, { organization_name: organizationName }, { tenantScoped: true });
  },
};
