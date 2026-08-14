import { api } from './api';
import type { TenantDashboardSummaryResponse } from '../types/tenant-dashboard.types';

export const tenantDashboardService = {
  async getSummary() {
    const response = await api.get<TenantDashboardSummaryResponse>('/tenant/dashboard/summary', {
      tenantScoped: true,
    });

    return response.data.data;
  },
};
