export type TenantMemberRole = 'owner' | 'admin' | 'member';

export interface TenantMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: TenantMemberRole;
  joined_at: string | null;
  effective_permissions: string[];
  direct_permissions: string[];
  protected?: boolean;
}

export interface TenantMembersResponse {
  data: TenantMember[];
}
