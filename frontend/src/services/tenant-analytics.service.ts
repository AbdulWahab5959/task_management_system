import { api } from './api';
import type { TenantDashboardSummaryResponse } from '../types/tenant-dashboard.types';

export const tenantAnalyticsService = {
  get() {
    return api.get<TenantDashboardSummaryResponse>('/tenant/analytics', { tenantScoped: true });
  },
};
