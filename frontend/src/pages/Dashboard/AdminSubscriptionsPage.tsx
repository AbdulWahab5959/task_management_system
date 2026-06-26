import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Eye,
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
}

interface SubscriptionCounts {
  total: number;
  active: number;
  pending: number;
  cancelled: number;
}

function getStatusBadgeTone(status: string): { className: string; icon: ReactNode } {
  switch (status) {
    case 'active':
      return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'trialing':
      return { className: 'border-sky-200 bg-sky-50 text-sky-700', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'pending':
      return { className: 'border-amber-200 bg-amber-50 text-amber-700', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'cancelled':
      return { className: 'border-rose-200 bg-rose-50 text-rose-700', icon: <X className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'expired':
      return { className: 'border-slate-200 bg-slate-50 text-slate-600', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'failed':
      return { className: 'border-rose-200 bg-rose-50 text-rose-700', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
    default:
      return { className: 'border-slate-200 bg-slate-50 text-slate-600', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
  }
}

function StatusBadge({ status }: { status: string }) {
  const tone = getStatusBadgeTone(status);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${tone.className}`}>
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
  const [counts, setCounts] = useState<SubscriptionCounts>({ total: 0, active: 0, pending: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscription | null>(null);

  const loadSubscriptions = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/admin/subscriptions?${params.toString()}`);
      setSubscriptions(response.data.data ?? []);
      setCounts(response.data.counts ?? { total: 0, active: 0, pending: 0, cancelled: 0 });
      setTotalPages(response.data.pagination?.last_page ?? 1);
    } catch {
      setError('Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    void loadSubscriptions(page);
  }, [page, loadSubscriptions]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Subscriptions"
        description="Review subscription ownership, status, billing windows, and gateway records."
      />

      {!loading && !error ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total" value={String(counts.total)} description="All subscriptions" icon={<Crown className="h-6 w-6" />} variant="indigo" />
          <StatsCard title="Active" value={String(counts.active)} description="Active subscriptions" icon={<ShieldCheck className="h-6 w-6" />} variant="emerald" />
          <StatsCard title="Pending" value={String(counts.pending)} description="Pending payments" icon={<Clock className="h-6 w-6" />} variant="amber" />
          <StatsCard title="Cancelled" value={String(counts.cancelled)} description="Cancelled subscriptions" icon={<X className="h-6 w-6" />} variant="rose" />
        </div>
      ) : null}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>All subscriptions</CardTitle>
                <CardDescription>Search users, filter status, and inspect billing periods.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search user or plan..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
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
                description={search || statusFilter ? 'Try a different search or status filter.' : 'No subscriptions have been created yet.'}
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gateway</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Period</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {subscriptions.map((subscription) => (
                          <tr key={subscription.id} className="transition hover:bg-slate-50/80">
                            <td className="whitespace-nowrap px-4 py-4">
                              <p className="text-sm font-semibold text-slate-900">{subscription.user_name || subscription.tenant_name || 'Not set'}</p>
                              {subscription.user_email ? <p className="text-xs text-slate-500">{subscription.user_email}</p> : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{subscription.plan_name || 'Not set'}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                                {subscription.gateway || 'manual'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">{formatAmount(subscription.plan_amount, subscription.plan_currency)}</td>
                            <td className="whitespace-nowrap px-4 py-4"><StatusBadge status={subscription.status} /></td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs leading-5 text-slate-500">
                              <p>Start: {formatDate(periodStart(subscription))}</p>
                              <p>End: {formatDate(periodEnd(subscription))}</p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(subscription.created_at)}</td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <button
                                type="button"
                                onClick={() => setSelectedSubscription(subscription)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                View
                              </button>
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
    </>
  );
}
