import { api } from './api';
import type { TenantListResponse, TenantResponse } from '../types/tenant.types';

export const tenantService = {
  list() {
    return api.get<TenantListResponse>('/tenants');
  },

  create(name: string) {
    return api.post<TenantResponse>('/tenants', { name });
  },

  get(id: number) {
    // The URL identifies this tenant; tenant-scoped data endpoints use tenantScoped.
    return api.get<TenantResponse>(`/tenants/${id}`);
  },

  destroy(id: number) {
    return api.delete<{ message: string }>(`/tenants/${id}`, { tenantScoped: true });
  },
};
