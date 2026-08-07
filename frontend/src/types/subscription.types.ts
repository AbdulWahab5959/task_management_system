export interface Plan {
  id: number;
  name: string;
  slug: string;
  stripe_plan_id: string | null;
  stripe_price_id?: string | null;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: Record<string, number | string>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  tenant_id: number;
  plan_id: number;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at?: string;
}
