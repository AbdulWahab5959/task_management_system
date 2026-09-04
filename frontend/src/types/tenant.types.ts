export type TenantRole = 'owner' | 'admin' | 'member';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'cancelled' | string;
  role: TenantRole | string | null;
  owner_id?: number;
  is_primary?: boolean;
  archived_at?: string | null;
  permanent_deletion_scheduled_at?: string | null;
  trial_ends_at?: string | null;
  created_at?: string;
  permissions?: string[];
}

export interface TenantListResponse {
  data: Tenant[];
}

export interface TenantResponse {
  data: Tenant;
}
