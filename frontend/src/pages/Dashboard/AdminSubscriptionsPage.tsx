import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Eye,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import StatsCard from '../../components/dashboard/StatsCard';
import { api } from '../../services/api';
import { cancelSubscriptionNow as cancelNowApi } from '../../services/admin-subscriptions.service';

interface AdminSubscription {
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

interface SubscriptionSummaryStats {
  total_subscriptions: number;
  active_subscriptions: number;
  cancelled_subscriptions: number;
  pending_payments: number;
  paid_payments: number;
  total_paid_amount: number;
}

function getStatusBadgeTone(status: string): { className: string; icon: ReactNode } {
  switch (status) {
    case 'active':
      return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'trialing':
      return { className: 'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-sky-100', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'pending':
      return { className: 'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'cancelled':
      return { className: 'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100', icon: <X className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'expired':
      return { className: 'border-slate-200 bg-slate-50 text-slate-600 ring-1 ring-slate-100', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'failed':
      return { className: 'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
    default:
      return { className: 'border-slate-200 bg-slate-50 text-slate-600 ring-1 ring-slate-100', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
  }
}

function StatusBadge({ status }: { status: string }) {
  const tone = getStatusBadgeTone(status);

  return (
    <span className={`dashboard-badge capitalize ${tone.className}`}>
      {tone.icon}
      {status.replace('_', ' ')}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatAmount(amount?: string | number, currency?: string): string {
  if (!amount) return 'Not set';

  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(value)) return String(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(value);
}

function periodStart(subscription: AdminSubscription): string | undefined {
  return subscription.starts_at || subscription.current_period_start;
}

function periodEnd(subscription: AdminSubscription): string | undefined {
  return subscription.ends_at || subscription.current_period_end;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [summaryStats, setSummaryStats] = useState<SubscriptionSummaryStats>({
    total_subscriptions: 0,
    active_subscriptions: 0,
    cancelled_subscriptions: 0,
    pending_payments: 0,
    paid_payments: 0,
    total_paid_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscription | null>(null);

  // Cancel Now modal
  const [cancelNowModal, setCancelNowModal] = useState<AdminSubscription | null>(null);
  const [cancellingNow, setCancellingNow] = useState(false);
  const [cancelNowError, setCancelNowError] = useState('');
  const [cancelNowSuccess, setCancelNowSuccess] = useState('');

  const loadSubscriptions = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan_id', planFilter);
      if (gatewayFilter) params.set('gateway', gatewayFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await api.get(`/admin/subscriptions?${params.toString()}`);
      setSubscriptions(response.data.data ?? []);
      setSummaryStats(response.data.summary_stats ?? {
        total_subscriptions: 0,
        active_subscriptions: 0,
        cancelled_subscriptions: 0,
        pending_payments: 0,
        paid_payments: 0,
        total_paid_amount: 0,
      });
      setTotalPages(response.data.pagination?.last_page ?? 1);
    } catch {
      setError('Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter, gatewayFilter, startDate, endDate]);

  useEffect(() => {
    queueMicrotask(() => void loadSubscriptions(page));
  }, [page, loadSubscriptions]);

  const handleCancelNow = async () => {
    if (!cancelNowModal) return;

    setCancellingNow(true);
    setCancelNowError('');
    setCancelNowSuccess('');

    try {
      const result = await cancelNowApi(cancelNowModal.id);
      setCancelNowSuccess(result.message);
      setCancelNowModal(null);
      void loadSubscriptions(page);
    } catch {
      setCancelNowError('Failed to cancel subscription immediately. Please try again.');
    } finally {
      setCancellingNow(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Subscriptions"
        description="Review subscription ownership, status, billing windows, and gateway records."
      />

      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Total" value={String(summaryStats.total_subscriptions)} description="All subscriptions" icon={<Crown className="h-5 w-5" />} variant="indigo" />
          <StatsCard title="Active" value={String(summaryStats.active_subscriptions)} description="Active subscriptions" icon={<ShieldCheck className="h-5 w-5" />} variant="emerald" />
          <StatsCard title="Cancelled" value={String(summaryStats.cancelled_subscriptions)} description="Cancelled subscriptions" icon={<X className="h-5 w-5" />} variant="rose" />
          <StatsCard title="Revenue" value={formatAmount(summaryStats.total_paid_amount ?? '0')} description="Total paid amount" icon={<CheckCircle2 className="h-5 w-5" />} variant="violet" />
        </div>
      ) : null}

      {cancelNowSuccess ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {cancelNowSuccess}
        </div>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>All subscriptions</CardTitle>
                <CardDescription>Search users, filter status, and inspect billing periods.</CardDescription>
              </div>
              <p className="text-xs font-medium text-slate-400">15 rows per page</p>
            </div>

            <div className="dashboard-filter-bar">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search user or plan..."
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  className="dashboard-control dashboard-control--icon"
                />
              </div>
              <select
                value={statusFilter}
                  onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                className="dashboard-control"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={planFilter}
                  onChange={(event) => { setPlanFilter(event.target.value); setPage(1); }}
                className="dashboard-control"
              >
                <option value="">All plans</option>
                <option value="1">Basic</option>
                <option value="2">Pro</option>
                <option value="3">Enterprise</option>
              </select>
              <select
                value={gatewayFilter}
                  onChange={(event) => { setGatewayFilter(event.target.value); setPage(1); }}
                className="dashboard-control"
              >
                <option value="">All gateways</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="manual">Manual</option>
              </select>
              <input
                type="date"
                aria-label="Start date"
                value={startDate}
                  onChange={(event) => { setStartDate(event.target.value); setPage(1); }}
                className="dashboard-control"
              />
              <input
                type="date"
                aria-label="End date"
                value={endDate}
                  onChange={(event) => { setEndDate(event.target.value); setPage(1); }}
                className="dashboard-control"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-rose-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadSubscriptions(page)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Retry
                </button>
              </div>
            ) : subscriptions.length === 0 ? (
              <EmptyState
                icon={<Crown className="h-6 w-6" aria-hidden="true" />}
                title="No subscriptions found"
                description={search || statusFilter || planFilter || gatewayFilter || startDate || endDate ? 'Try a different search or filter.' : 'No subscriptions have been created yet.'}
              />
            ) : (
              <>
                <div className="dashboard-table-shell">
                  <div className="dashboard-table-scroll">
                    <table className="dashboard-table dashboard-table-wide">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Plan</th>
                          <th>Gateway</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Period</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((subscription) => (
                          <tr key={subscription.id}>
                            <td className="whitespace-nowrap">
                              <p className="text-sm font-semibold text-slate-900">{subscription.user_name || subscription.tenant_name || 'Not set'}</p>
                              {subscription.user_email ? <p className="text-xs text-slate-500">{subscription.user_email}</p> : null}
                            </td>
                            <td className="whitespace-nowrap text-sm font-medium text-slate-700">{subscription.plan_name || 'Not set'}</td>
                            <td className="whitespace-nowrap text-sm text-slate-500">
                              <span className="dashboard-badge gateway-badge capitalize">
                                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                                {subscription.gateway || 'manual'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap text-sm font-bold text-slate-950">{formatAmount(subscription.plan_amount, subscription.plan_currency)}</td>
                            <td className="whitespace-nowrap"><StatusBadge status={subscription.status} /></td>
                            <td className="whitespace-nowrap text-xs leading-5 text-slate-500">
                              <p>Start: {formatDate(periodStart(subscription))}</p>
                              <p>End: {formatDate(periodEnd(subscription))}</p>
                            </td>
                            <td className="whitespace-nowrap text-sm text-slate-600">{formatDate(subscription.created_at)}</td>
                            <td className="whitespace-nowrap">
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubscription(subscription)}
                                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/50 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  View
                                </button>
                                {subscription.status === 'active' || subscription.status === 'trialing' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelNowError('');
                                      setCancelNowSuccess('');
                                      setCancelNowModal(subscription);
                                    }}
                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white/90 px-3 text-xs font-semibold text-rose-700 shadow-sm shadow-slate-200/50 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    Cancel Now
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        disabled={page >= totalPages}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View subscription detail modal */}
      {selectedSubscription ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Subscription details</h2>
              <button
                type="button"
                aria-label="Close subscription details"
                onClick={() => setSelectedSubscription(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{selectedSubscription.user_name || selectedSubscription.tenant_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-0.5 text-sm text-slate-700">{selectedSubscription.user_email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{selectedSubscription.plan_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatAmount(selectedSubscription.plan_amount, selectedSubscription.plan_currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <div className="mt-1"><StatusBadge status={selectedSubscription.status} /></div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gateway</p>
                  <p className="mt-0.5 text-sm capitalize text-slate-700">{selectedSubscription.gateway || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Start date</p>
                  <p className="mt-0.5 text-sm text-slate-700">{formatDate(periodStart(selectedSubscription))}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">End date</p>
                  <p className="mt-0.5 text-sm text-slate-700">{formatDate(periodEnd(selectedSubscription))}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stripe Subscription ID</p>
                  <p className="mt-0.5 text-sm text-slate-700">{selectedSubscription.stripe_subscription_id || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stripe Customer ID</p>
                  <p className="mt-0.5 text-sm text-slate-700">{selectedSubscription.stripe_customer_id || 'Not set'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</p>
                <p className="mt-0.5 text-sm text-slate-700">{formatDate(selectedSubscription.created_at)}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedSubscription(null)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel Now confirmation modal */}
      {cancelNowModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-now-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <AlertCircle className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="cancel-now-title" className="text-base font-semibold text-slate-950">Cancel subscription immediately</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    This will immediately cancel the user's subscription and remove access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close cancel-now modal"
                onClick={() => setCancelNowModal(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                User <strong>{cancelNowModal.user_name || cancelNowModal.tenant_name || 'Unknown'}</strong> will lose access immediately.
                {cancelNowModal.stripe_subscription_id ? (
                  <p className="mt-2 text-amber-700">Stripe subscription will be cancelled and not renewed.</p>
                ) : null}
              </div>
              {cancelNowError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {cancelNowError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelNowModal(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={() => void handleCancelNow()}
                disabled={cancellingNow}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancellingNow ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                {cancellingNow ? 'Cancelling...' : 'Confirm Cancel Now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
