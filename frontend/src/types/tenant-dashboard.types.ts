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
  organization_over_limit?: boolean;
  entitlements?: string[];
  limits?: Record<string, number | string>;
  usage?: Record<string, { used: number; limit: number | string | null; remaining: number | string }>;
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

export interface TenantActivityUser {
  id: number;
  name: string;
}

export interface TenantActivityItem extends RecentActivityItem {
  user: TenantActivityUser | null;
}

export interface PaginatedTenantActivity {
  data: TenantActivityItem[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
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
  projects: {
    total: number;
    active: number;
    completed: number;
    tasks_total: number;
    tasks_completed: number;
    tasks_overdue: number;
    recent_projects: Array<{ id: number; name: string; status: string; due_date: string | null }>;
    recent_tasks: Array<{ id: number; title: string; status: string; priority: string; project_id: number; project_name: string | null; due_date: string | null }>;
    my_tasks: Array<{ id: number; title: string; status: string; priority: string; project_id: number; project_name: string | null; due_date: string | null }>;
    upcoming_deadlines: Array<{ id: number; title: string; project_name: string | null; due_date: string | null }>;
  };
  billing: BillingSummary;
  activity: RecentActivityItem[];
  activity_available: boolean;
  activity_note?: string;
  setup_checklist: SetupChecklistItem[];
}

export interface TenantDashboardSummaryResponse {
  data: TenantDashboardSummary;
}
