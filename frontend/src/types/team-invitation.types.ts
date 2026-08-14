export type InvitationRole = 'admin' | 'member';
export type InvitationStatus = 'pending' | 'expired' | 'accepted' | 'rejected' | 'revoked';

export interface TenantInvitation {
  id: number;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  invited_by: { id: number; name: string; email: string } | null;
  expires_at: string;
  created_at: string;
  tenant?: { id: number; name: string; slug: string } | null;
}

export interface InvitationPreview {
  tenant_id: number;
  email: string;
  role: InvitationRole;
  tenant_name: string;
  inviter_name: string | null;
  expires_at: string;
}

export interface TenantInvitationsResponse {
  data: TenantInvitation[];
}

export interface InvitationPreviewResponse {
  data: InvitationPreview;
}
