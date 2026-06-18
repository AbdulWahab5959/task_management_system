import type { UserRole, UserStatus } from '../types/auth.types';

export function formatRole(role?: UserRole | null) {
  if (!role) {
    return 'Unknown';
  }

  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatStatus(status?: UserStatus | null) {
  if (!status) {
    return 'Unknown';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}
