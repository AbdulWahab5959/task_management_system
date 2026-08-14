import { api } from './api';
import type { TenantSettings, TenantSettingsResponse } from '../types/tenant-settings.types';

export const tenantSettingsService = {
  get() {
    return api.get<TenantSettingsResponse>('/tenant/settings', { tenantScoped: true });
  },

  update(payload: Partial<TenantSettings>) {
    return api.put<TenantSettingsResponse>('/tenant/settings', payload, { tenantScoped: true });
  },
};
