export interface OrganizationProfileSummary {
  industry: string | null;
  website: string | null;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  completion_percent: number;
  completed_fields: string[];
  missing_fields: string[];
}

export interface TeamSummary {
  members_total: number;
  owners: number;
  admins: number;
  members: number;
  pending_invitations: number;
}

export interface UserSubscriptionSummary {
  id: number;
  plan_name: string | null;
  status: string;
  billing_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  amount: string | number | null;
  currency: string | null;
}

export interface BillingSummary {
  subscription_scope: 'tenant' | 'user';
  organizations_used: number;
  organization_limit: number | string;
  organizations_remaining: number | string;
  plan_features: string[];
  current_subscription: UserSubscriptionSummary | null;
}

export interface SetupChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface RecentActivityItem {
  id: number;
  action: string;
  description: string | null;
  created_at: string | null;
}

export interface TenantDashboardSummary {
  tenant: {
    id: number;
    name: string;
    slug: string;
    status: string;
    current_user_role: 'owner' | 'admin' | 'member' | string | null;
    created_at: string | null;
  };
  organization_profile: OrganizationProfileSummary;
  team: TeamSummary;
  billing: BillingSummary;
  activity: RecentActivityItem[];
  activity_available: boolean;
  activity_note?: string;
  setup_checklist: SetupChecklistItem[];
}

export interface TenantDashboardSummaryResponse {
  data: TenantDashboardSummary;
}
