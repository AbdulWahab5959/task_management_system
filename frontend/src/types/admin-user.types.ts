import type { User, UserRole, UserStatus } from './auth.types';

export type EmailVerificationFilter = 'verified' | 'unverified';

export interface AdminUser extends User {
  email_verified_at?: string | null;
}

export interface PaginatedAdminUsers {
  data: AdminUser[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface AdminUserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  verified?: EmailVerificationFilter;
}
