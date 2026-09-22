import { api } from './api';
import type {
  PaginatedTenantActivity,
  TenantDashboardSummaryResponse,
} from '../types/tenant-dashboard.types';

export interface TenantDashboardActivityParams {
  page?: number;
  per_page?: number;
}

export const tenantDashboardService = {
  async getSummary() {
    const response = await api.get<TenantDashboardSummaryResponse>('/tenant/dashboard/summary', {
      tenantScoped: true,
    });

    return response.data.data;
  },

  async getActivity(params: TenantDashboardActivityParams = {}) {
    const response = await api.get<PaginatedTenantActivity>('/tenant/dashboard/activity', {
      tenantScoped: true,
      params,
    });

    return response.data;
  },
};
