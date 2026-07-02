import { api } from './api';

export interface AdminSubscription {
  id: number;
  tenant_id?: number;
  user_id?: number;
  plan_id: number;
  gateway?: string;
  status: string;
  starts_at?: string;
  ends_at?: string;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string;
  cancel_at_period_end?: boolean;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  user_name?: string;
  user_email?: string;
  plan_name?: string;
  plan_amount?: string | number;
  plan_currency?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
}

export interface AdminPayment {
  id: number;
  user_id: number;
  plan_id?: number;
  subscription_id?: number;
  gateway: string;
  reference: string;
  amount: string;
  currency: string;
  status: string;
  refunded_amount?: string;
  refund_status?: string;
  paid_at?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  plan_name?: string;
}

export interface CancelNowResponse {
  message: string;
  subscription: {
    id: number;
    status: string;
    cancelled_at: string;
    ends_at: string;
  };
}

export interface RefundResponse {
  message: string;
  refund: {
    id: number;
    amount: string;
    status: string;
    provider_refund_id: string | null;
    refunded_at: string | null;
  };
  payment: {
    id: number;
    status: string;
    refunded_amount: string;
    refund_status: string;
  };
}

export async function cancelSubscriptionNow(subscriptionId: number): Promise<CancelNowResponse> {
  const response = await api.post<CancelNowResponse>(`/admin/subscriptions/${subscriptionId}/cancel-now`);
  return response.data;
}

export async function refundPayment(paymentId: number, amount?: number, reason?: string): Promise<RefundResponse> {
  const response = await api.post<RefundResponse>(`/admin/payments/${paymentId}/refund`, {
    amount,
    reason,
  });
  return response.data;
}