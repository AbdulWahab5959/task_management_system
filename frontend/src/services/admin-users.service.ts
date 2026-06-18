import { api } from './api';
import type { UserRole, UserStatus } from '../types/auth.types';
import type { AdminUser, AdminUserListParams, PaginatedAdminUsers } from '../types/admin-user.types';

interface UpdateUserPayload {
  name: string;
  email: string;
}

export const adminUsersService = {
  list(params: AdminUserListParams) {
    return api.get<PaginatedAdminUsers>('/admin/users', { params });
  },

  get(id: number) {
    return api.get<AdminUser>(`/admin/users/${id}`);
  },

  update(id: number, payload: UpdateUserPayload) {
    return api.put<AdminUser>(`/admin/users/${id}`, payload);
  },

  updateRole(id: number, role: UserRole) {
    return api.put<AdminUser>(`/admin/users/${id}/role`, { role });
  },

  updateStatus(id: number, status: UserStatus) {
    return api.put<AdminUser>(`/admin/users/${id}/status`, { status });
  },
};
