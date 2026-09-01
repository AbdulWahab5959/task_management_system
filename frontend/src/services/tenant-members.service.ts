import { api } from './api';
import type { TenantMember, TenantMembersResponse } from '../types/tenant-member.types';

export type PermissionMeta = { key: string; name: string; description: string; group: string };
export type PermissionGroupsResponse = { data: Record<string, PermissionMeta[]>; assignable: string[] };
export type MemberPermissionsResponse = { data: { user: Pick<TenantMember, 'id' | 'name' | 'email'>; role: TenantMember['role']; effective_permissions: string[]; direct_permissions: string[]; protected: boolean } };

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
  permissionGroups() { return api.get<PermissionGroupsResponse>('/tenant/permissions', { tenantScoped: true }); },
  permissions(userId: number) { return api.get<MemberPermissionsResponse>(`/tenant/members/${userId}/permissions`, { tenantScoped: true }); },
  updatePermissions(userId: number, permissions: string[]) { return api.put<MemberPermissionsResponse>(`/tenant/members/${userId}/permissions`, { permissions }, { tenantScoped: true }); },
  resetPermissions(userId: number) { return api.post<MemberPermissionsResponse>(`/tenant/members/${userId}/permissions/reset`, undefined, { tenantScoped: true }); },
};
