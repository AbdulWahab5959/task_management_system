import { api } from './api';
import type { UserSettings, UserSettingsResponse, UserSettingsUpdate } from '../types/user-settings.types';

export const userSettingsService = {
  async get(): Promise<UserSettings> {
    const response = await api.get<UserSettingsResponse>('/settings/user');
    return response.data.data;
  },

  async update(payload: UserSettingsUpdate): Promise<UserSettings> {
    const response = await api.put<UserSettingsResponse>('/settings/user', payload);
    return response.data.data;
  },
};
