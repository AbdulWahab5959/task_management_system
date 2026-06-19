import { api } from './api';
import type { PaginatedActivityLogs } from '../types/activity-log.types';

interface ActivityLogListParams {
  page?: number;
  per_page?: number;
  action?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
}

export const adminActivityLogsService = {
  list(params: ActivityLogListParams) {
    return api.get<PaginatedActivityLogs>('/admin/activity-logs', { params });
  },

  actions() {
    return api.get<string[]>('/admin/activity-logs/actions');
  },
};