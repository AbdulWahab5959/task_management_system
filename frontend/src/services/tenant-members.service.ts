import { api } from './api';
import type { TenantMembersResponse } from '../types/tenant-member.types';

export const tenantMembersService = {
  list() {
    return api.get<TenantMembersResponse>('/tenant/members', { tenantScoped: true });
  },

  updateRole(userId: number, role: 'admin' | 'member') {
    return api.put(`/tenant/members/${userId}/role`, { role }, { tenantScoped: true });
  },

  remove(userId: number) {
    return api.delete(`/tenant/members/${userId}`, { tenantScoped: true });
  },
};
