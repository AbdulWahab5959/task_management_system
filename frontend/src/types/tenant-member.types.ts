export type TenantMemberRole = 'owner' | 'admin' | 'member';

export interface TenantMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: TenantMemberRole;
  joined_at: string | null;
}

export interface TenantMembersResponse {
  data: TenantMember[];
}
