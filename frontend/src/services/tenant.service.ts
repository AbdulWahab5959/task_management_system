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
};
