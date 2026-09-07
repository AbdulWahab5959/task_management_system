import { api } from './api';

export interface BillingPlan {
  id: number;
  name: string;
  description?: string;
  amount: string;
  price: string;
  currency: string;
  interval: string | null;
  billing_interval: string | null;
  features: string[];
  entitlements?: string[];
  limits: Record<string, number | string>;
  is_popular?: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface CurrentSubscription {
  id: number;
  tenant_id?: number | null;
  user_id?: number | null;
  plan_id: number;
  status: string;
  gateway?: string;
  trial_ends_at?: string;
  starts_at?: string;
  ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string;
  cancel_at_period_end?: boolean;
  created_at: string;
  plan?: {
    id: number;
    name: string;
    description?: string;
    price: string;
    interval: string;
    features: string[];
    is_active: boolean;
  };
}

export interface PaymentRecord {
  id: number;
  reference?: string;
  gateway?: string;
  amount: string;
  currency: string;
  status: string;
  refunded_amount?: number;
  refund_status?: string;
  refund_display?: {
    label: string;
    status: string;
    description: string;
  } | null;
  paid_at?: string;
  created_at: string;
  plan?: {
    id: number;
    name: string;
  } | null;
}

export interface CurrentBillingResponse {
  subscription_scope: 'tenant' | 'user';
  payment_scope?: 'user';
  tenant_id?: number | null;
  can_manage_billing?: boolean;
  organizations_used: number;
  organization_limit: number | string;
  organizations_remaining: number | string;
  subscription: CurrentSubscription | null;
  current_plan: BillingPlan | null;
  payment_history: PaymentRecord[];
  payment_attention?: string | null;
  organization_over_limit?: boolean;
  organization_grace_ends_at?: string | null;
  limits?: Record<string, number | string>;
  entitlements?: string[];
  usage?: Record<string, { used: number; limit: number | string | null; remaining: number | string }>;
}

export type InvoiceStatus = 'paid' | 'pending' | 'failed';

export interface InvoiceRecord {
  id: number;
  invoice_number: string;
  plan: string | null;
  amount: string;
  currency: string;
  status: InvoiceStatus;
  invoice_date: string;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  invoice_url?: string | null;
  invoice_pdf_available: boolean;
}

export interface InvoicePage {
  data: InvoiceRecord[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface CheckoutResponse {
  payment_reference: string;
  checkout_url: string | null;
  message?: string;
}

export interface StripeCheckoutResponse {
  checkout_url: string;
  session_id: string;
  payment_reference: string;
}

export async function getCurrentBilling(tenantId?: number | null): Promise<CurrentBillingResponse> {
  void tenantId;
  const response = await api.get<CurrentBillingResponse>('/billing/current');
  return response.data;
}

export async function getBillingPlans(): Promise<{ data: BillingPlan[] }> {
  const response = await api.get<{ data: BillingPlan[] }>('/billing/plans');
  return response.data;
}

export async function createCheckoutSession(planId: number, gateway = 'manual'): Promise<CheckoutResponse> {
  const response = await api.post<CheckoutResponse>('/billing/checkout', {
    plan_id: planId,
    gateway,
  });
  return response.data;
}

export async function createStripeCheckoutSession(
  planId: number,
  options?: { retryPaymentReference?: string },
): Promise<StripeCheckoutResponse> {
  const response = await api.post<StripeCheckoutResponse>('/billing/stripe/checkout', {
    plan_id: planId,
    ...(options?.retryPaymentReference ? { retry_payment_reference: options.retryPaymentReference } : {}),
  });
  return response.data;
}

export async function cancelUserSubscription(): Promise<{ message: string; subscription?: CurrentSubscription }> {
  const response = await api.post<{ message: string; subscription?: CurrentSubscription }>('/billing/cancel');
  return response.data;
}

export async function cancelNowUserSubscription(): Promise<{ message: string; subscription?: CurrentSubscription }> {
  const response = await api.post<{ message: string; subscription?: CurrentSubscription }>('/billing/cancel-now');
  return response.data;
}

export async function getPaymentHistory(): Promise<{ data: PaymentRecord[]; links: Record<string, string>; meta: Record<string, unknown> }> {
  const response = await api.get('/billing/payments');
  return response.data;
}

export async function getInvoices(params: { status?: InvoiceStatus | ''; from?: string; to?: string; page?: number } = {}): Promise<InvoicePage> {
  const response = await api.get<InvoicePage>('/billing/invoices', { params });
  return response.data;
}

export async function getInvoice(id: number): Promise<InvoiceRecord> {
  const response = await api.get<{ data: InvoiceRecord } | InvoiceRecord>(`/billing/invoices/${id}`);
  return 'data' in response.data ? response.data.data : response.data;
}

export async function downloadInvoice(id: number): Promise<Blob> {
  const response = await api.get<Blob>(`/billing/invoices/${id}/download`, { responseType: 'blob' });
  return response.data;
}
