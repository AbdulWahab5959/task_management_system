export type TenantSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'pending'
  | 'missing'
  | string;

export interface TenantSubscriptionAccess {
  subscription: {
    id: number | null;
    status: TenantSubscriptionStatus;
    requires_payment: boolean;
  };
  plan: {
    id: number;
    name: string;
  } | null;
  features: string[];
  limits: Record<string, number | boolean | string | null>;
}
