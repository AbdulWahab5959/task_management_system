export interface AdminAnalyticsStats {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  new_users_this_month: number;
  contact_messages_total: number;
  new_contact_messages: number;
  activity_logs_count: number;
  organizations_total: number;
  organizations_active: number;
  organizations_suspended: number;
  subscriptions_active: number;
  subscriptions_trialing: number;
  subscriptions_past_due: number;
  revenue_total: number;
  revenue_last_30_days: number;
  paid_transactions: number;
}

export interface RecentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified_at: string | null;
  created_at: string;
}

export interface RecentActivityItem {
  id: number;
  action: string;
  description: string;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  ip_address: string | null;
  created_at: string;
}

export interface ContactSummary {
  new: number;
  read: number;
  replied: number;
}

export interface AnalyticsTrend {
  label: string;
  signups: number;
  revenue: number;
}

export interface PlanDistributionItem {
  name: string;
  subscriptions: number;
}

export interface SupportSummary {
  open: number;
  pending: number;
  closed: number;
}

export interface AdminAnalyticsResponse {
  stats: AdminAnalyticsStats;
  recent_users: RecentUser[];
  recent_activity: RecentActivityItem[];
  contact_summary: ContactSummary;
  trends: AnalyticsTrend[];
  plan_distribution: PlanDistributionItem[];
  support_summary: SupportSummary;
}
