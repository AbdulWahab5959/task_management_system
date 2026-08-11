export interface ActivityLogUser {
  id: number;
  name: string;
  email: string;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  description: string | null;
  properties: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  user: ActivityLogUser | null;
  /** Sender email for contact form submissions (from properties.email) */
  contact_email?: string | null;
}

export interface PaginatedActivityLogs {
  data: ActivityLog[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}