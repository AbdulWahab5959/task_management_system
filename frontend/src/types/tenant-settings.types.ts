export type TenantSettings = {
  tenant_id: number;
  name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  country: string | null;
  timezone: string;
  currency: string;
};

export type TenantSettingsResponse = {
  data: TenantSettings;
};
