import { api } from './api';
import type { TenantSubscriptionAccess } from '../types/tenant-access.types';

export async function getTenantSubscriptionAccess(): Promise<TenantSubscriptionAccess> {
  const response = await api.get<TenantSubscriptionAccess>('/tenant/subscription/access', {
    tenantScoped: true,
  });

  return response.data;
}
