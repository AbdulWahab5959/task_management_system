import { api } from './api';
import type { AdminAnalyticsResponse } from '../types/admin-analytics.types';

export const adminAnalyticsService = {
  get() {
    return api.get<AdminAnalyticsResponse>('/admin/analytics');
  },
};