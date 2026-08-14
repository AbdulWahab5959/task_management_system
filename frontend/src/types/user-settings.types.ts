export interface UserNotificationPreferences {
  email_notifications_enabled: boolean;
  billing_notifications_enabled: boolean;
  team_notifications_enabled: boolean;
  security_notifications_enabled: boolean;
  marketing_emails_enabled: boolean;
  /** @deprecated Use the canonical *_notifications_enabled names. */
  email_enabled: boolean;
  /** @deprecated Use billing_notifications_enabled. */
  billing_enabled: boolean;
  /** @deprecated Use team_notifications_enabled. */
  team_enabled: boolean;
  /** @deprecated Use security_notifications_enabled. */
  security_enabled: boolean;
  /** @deprecated Use marketing_emails_enabled. */
  marketing_enabled: boolean;
}

export interface UserPreferences {
  timezone: string;
  locale: string;
}

export interface UserSecurityPreferences {
  two_factor_enabled: boolean;
  two_factor_status: 'coming_soon' | string;
}

export interface UserSettings {
  notifications: UserNotificationPreferences;
  preferences: UserPreferences;
  security: UserSecurityPreferences;
}

export interface UserSettingsResponse {
  data: UserSettings;
  message?: string;
}

export type UserSettingsUpdate = Partial<UserNotificationPreferences & UserPreferences>;
