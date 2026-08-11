import { api } from './api';
import type { ActivityLog } from '../types/activity-log.types';

export interface DashboardActivityResponse {
  data: ActivityLog[];
}

export async function getDashboardActivity(): Promise<DashboardActivityResponse> {
  const response = await api.get<DashboardActivityResponse>('/dashboard/activity');
  return response.data;
}