import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import StatsCard from '../../components/dashboard/StatsCard';
import { api } from '../../services/api';
import { refundPayment } from '../../services/admin-subscriptions.service';

interface AdminPayment {
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
  // New refund eligibility fields
  can_refund: boolean;
  refund_disabled_reason?: string | null;
  refundable_amount?: string;
  provider_payment_id?: string;
  provider_payment_intent_id?: string;
  provider_charge_id?: string;
  provider_invoice_id?: string;
  gateway_subscription_id?: string;
  latest_refund?: {
    id: number;
    amount: string;
    currency: string;
    status: string;
    reason?: string | null;
    provider_refund_id?: string | null;
    provider_payment_id?: string | null;
    refunded_at?: string | null;
    admin_name?: string | null;
    admin_email?: string | null;
  } | null;
  // Subscription information
  subscription_status?: string;
  subscription_cancel_at_period_end?: boolean;
  subscription_cancelled_at?: string;
  subscription_ends_at?: string;
}

interface PaymentSummaryStats {
  total_payments: number;
  pending_payments: number; 
  paid_payments: number;
  failed_payments: number;
  total_paid_amount: number;
}

const MISSING_REFUND_SOURCE_REASON = 'Refund unavailable: missing Stripe PaymentIntent or Charge ID.';

function getStatusBadgeTone(status: string): { className: string; icon: ReactNode } {
  switch (status) {
    case 'paid':
      return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'pending':
      return { className: 'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'failed':
    case 'verification_failed':
      return { className: 'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100', icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'cancelled':
      return { className: 'border-slate-200 bg-slate-50 text-slate-600 ring-1 ring-slate-100', icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'refunded':
      return { className: 'border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-100', icon: <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'partially_refunded':
      return { className: 'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-sky-100', icon: <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" /> };
    case 'needs_review':
      return { className: 'border-orange-200 bg-orange-50 text-orange-700 ring-1 ring-orange-100', icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
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

function formatAmount(amount: string | number, currency: string): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(value)) return String(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(value);
}

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [summaryStats, setSummaryStats] = useState<PaymentSummaryStats>({
    total_payments: 0,
    pending_payments: 0,
    paid_payments: 0,
    failed_payments: 0,
    total_paid_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Refund modal
  const [refundModal, setRefundModal] = useState<AdminPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [isPartialRefund, setIsPartialRefund] = useState(false);
  const [detailsModal, setDetailsModal] = useState<AdminPayment | null>(null);

  const loadPayments = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (gatewayFilter) params.set('gateway', gatewayFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await api.get(`/admin/payments?${params.toString()}`);
      setPayments(response.data.data ?? []);
      setSummaryStats(response.data.summary_stats ?? {
        total_payments: 0,
        pending_payments: 0,
        paid_payments: 0,
        failed_payments: 0,
        total_paid_amount: 0,
      });
      setTotalPages(response.data.pagination?.last_page ?? 1);
    } catch {
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, gatewayFilter, startDate, endDate]);

  useEffect(() => {
    queueMicrotask(() => void loadPayments(page));
  }, [page, loadPayments]);

  const handleOpenRefund = (payment: AdminPayment) => {
    setRefundModal(payment);
    setRefundAmount('');
    setRefundReason('');
    setRefundError('');
    setIsPartialRefund(false);
  };

  const handleRefund = async () => {
    if (!refundModal) return;

    setRefunding(true);
    setRefundError('');

    try {
      const amount = isPartialRefund && refundAmount ? Number.parseFloat(refundAmount) : undefined;
      const reason = refundReason || undefined;

      const refundableAmount = getRefundableAmount(refundModal);

      if (isPartialRefund && (!amount || !Number.isFinite(amount) || amount <= 0)) {
        setRefundError('Please enter a valid refund amount.');
        setRefunding(false);
        return;
      }

      if (isPartialRefund && amount !== undefined && amount > refundableAmount) {
        setRefundError(`Refund amount cannot exceed the remaining refundable balance of ${formatAmount(refundableAmount, refundModal.currency)}.`);
        setRefunding(false);
        return;
      }

      await refundPayment(refundModal.id, amount, reason);
      setRefundModal(null);
      void loadPayments(page);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process refund. Please try again.';
      setRefundError(errorMsg);
    } finally {
      setRefunding(false);
    }
  };

  const canRefund = (payment: AdminPayment): boolean => {
    return payment.can_refund === true && hasStripeRefundSource(payment);
  };

  const hasStripeRefundSource = (payment: AdminPayment): boolean => {
    return Boolean(
      payment.provider_payment_intent_id?.startsWith('pi_') ||
      payment.provider_charge_id?.startsWith('ch_'),
    );
  };

  const getRefundUnavailableReason = (payment: AdminPayment): string => {
    if (!hasStripeRefundSource(payment)) {
      return MISSING_REFUND_SOURCE_REASON;
    }

    return payment.refund_disabled_reason || 'Refund unavailable.';
  };

  const getRefundableAmount = (payment: AdminPayment): number => {
    const total = Number.parseFloat(payment.amount) || 0;
    const refunded = Number.parseFloat(payment.refunded_amount || '0') || 0;
    return Math.max(0, total - refunded);
  };

  const getRefundedAmount = (payment: AdminPayment): number => {
    const latestRefundAmount = payment.latest_refund?.amount
      ? Number.parseFloat(payment.latest_refund.amount)
      : 0;
    const totalRefunded = Number.parseFloat(payment.refunded_amount || '0') || 0;

    return latestRefundAmount > 0 ? latestRefundAmount : totalRefunded;
  };

  const refundableAmount = refundModal ? getRefundableAmount(refundModal) : 0;
  const requestedRefundAmount = Number.parseFloat(refundAmount);
  const refundAmountExceedsBalance = isPartialRefund
    && Number.isFinite(requestedRefundAmount)
    && requestedRefundAmount > refundableAmount;

  const getRefundedBy = (payment: AdminPayment): string => {
    return payment.latest_refund?.admin_email || payment.latest_refund?.admin_name || 'admin not recorded';
  };

  const getRefundCompletionMessage = (payment: AdminPayment): string | null => {
    const hasRefund = Boolean(
      payment.status === 'refunded' ||
      payment.status === 'partially_refunded' ||
      payment.refund_status === 'refunded' ||
      payment.refund_status === 'partially_refunded' ||
      payment.latest_refund ||
      getRefundedAmount(payment) > 0,
    );

    if (!hasRefund) return null;

    const refundType = payment.refund_status === 'partially_refunded' || payment.status === 'partially_refunded'
      ? 'Partial refund completed'
      : 'Refund completed';

    return `${refundType} by ${getRefundedBy(payment)} for ${formatAmount(getRefundedAmount(payment), payment.currency)}.`;
  };

  const handlePendingCheckout = (payment: AdminPayment) => {
    if (payment.status !== 'pending' || !payment.plan_id) return;

    navigate(`/dashboard/billing/checkout/${payment.plan_id}`);
  };

  const renderPaymentStatus = (payment: AdminPayment) => {
    if (payment.status !== 'pending' || !payment.plan_id) {
      return <StatusBadge status={payment.status} />;
    }

    const tone = getStatusBadgeTone(payment.status);

    return (
      <button
        type="button"
        onClick={() => handlePendingCheckout(payment)}
        aria-label={`Continue checkout for ${payment.plan_name || 'pending plan'}`}
        title="Continue checkout"
        className={`dashboard-badge capitalize transition hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${tone.className}`}
      >
        {tone.icon}
        {payment.status.replace('_', ' ')}
      </button>
    );
  };

  const detailValue = (value?: string | number | boolean | null): string => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    if (value === null || value === undefined || value === '') return 'Not set';
    return String(value);
  };

  const renderDetailRow = (label: string, value?: string | number | boolean | null) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] break-words text-right font-semibold text-slate-900">{detailValue(value)}</span>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payments"
        description="Review payment attempts, successful charges, and gateway records."
      />

      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Total" value={String(summaryStats.total_payments)} description="All payments" icon={<CreditCard className="h-5 w-5" />} variant="indigo" />
          <StatsCard title="Paid" value={String(summaryStats.paid_payments)} description="Successful payments" icon={<CheckCircle2 className="h-5 w-5" />} variant="emerald" />
          <StatsCard title="Pending" value={String(summaryStats.pending_payments)} description="Pending payments" icon={<Clock className="h-5 w-5" />} variant="amber" />
          <StatsCard title="Revenue" value={formatAmount(summaryStats.total_paid_amount ?? '0', 'USD')} description="Total paid amount" icon={<DollarSign className="h-5 w-5" />} variant="violet" />
        </div>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>All payments</CardTitle>
                <CardDescription>Search and filter transactions across the platform.</CardDescription>
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
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
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
                  onClick={() => void loadPayments(page)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Retry
                </button>
              </div>
            ) : payments.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" aria-hidden="true" />}
                title="No payments found"
                description={search || statusFilter || gatewayFilter || startDate || endDate ? 'Try a different search or filter.' : 'No payments have been recorded yet.'}
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
                          <th>Refund</th>
                          <th>Reference</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="whitespace-nowrap">
                              <p className="text-sm font-semibold text-slate-900">{payment.user_name || 'Not set'}</p>
                              {payment.user_email ? <p className="text-xs text-slate-500">{payment.user_email}</p> : null}
                            </td>
                            <td className="whitespace-nowrap text-sm font-medium text-slate-700">{payment.plan_name || 'Not set'}</td>
                            <td className="whitespace-nowrap text-sm text-slate-500">
                              <span className="dashboard-badge gateway-badge capitalize">
                                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                                {payment.gateway || 'manual'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap text-sm font-bold text-slate-950">{formatAmount(payment.amount, payment.currency)}</td>
                            <td className="whitespace-nowrap">{renderPaymentStatus(payment)}</td>
                            <td className="whitespace-nowrap">
                              {payment.refund_status ? (
                                <StatusBadge status={payment.refund_status} />
                              ) : (
                                <span className="text-xs text-slate-400">Not refunded</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap">
                              <span className="font-mono text-xs font-medium text-slate-600">{payment.reference || 'Not set'}</span>
                            </td>
                            <td className="whitespace-nowrap text-sm text-slate-600">{formatDate(payment.paid_at || payment.created_at)}</td>
                            <td className="align-top">
                              {canRefund(payment) ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRefund(payment)}
                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/50 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                    Refund
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailsModal(payment)}
                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                                  >
                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    View
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDetailsModal(payment)}
                                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  View
                                </button>
                              )}
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

      {/* Refund modal */}
      {refundModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-labelledby="refund-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-5 border-b border-slate-100 bg-white px-6 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <RotateCcw className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Payment action</p>
                  <h2 id="refund-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Refund payment</h2>
                  <p className="mt-1 text-sm text-slate-500">Return funds securely through Stripe.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close refund modal"
                onClick={() => setRefundModal(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Payment reference</p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-700" title={refundModal.reference}>{refundModal.reference}</p>
                  <p className="mt-1 text-xs text-slate-500">{refundModal.user_name || 'Unknown user'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Amount paid</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{formatAmount(refundModal.amount, refundModal.currency)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs font-medium text-emerald-700">Remaining refundable</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-900">{formatAmount(refundableAmount, refundModal.currency)}</p>
                </div>
              </div>

              <label htmlFor="partial-refund" className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3.5 transition hover:border-violet-200 hover:bg-violet-50/40">
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Partial refund</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Choose a specific amount instead of refunding the full balance.</span>
                </span>
                <input
                  type="checkbox"
                  id="partial-refund"
                  checked={isPartialRefund}
                  onChange={(e) => {
                    setIsPartialRefund(e.target.checked);
                    if (!e.target.checked) setRefundAmount('');
                  }}
                  className="h-5 w-5 rounded-md border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-200"
                />
              </label>

              {isPartialRefund ? (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="refund-amount" className="block text-sm font-semibold text-slate-800">Refund amount</label>
                    <span className="text-xs font-medium tabular-nums text-slate-500">Max {formatAmount(refundableAmount, refundModal.currency)}</span>
                  </div>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">{refundModal.currency}</span>
                    <input
                      id="refund-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={refundableAmount}
                      value={refundAmount}
                      onChange={(e) => {
                        setRefundAmount(e.target.value);
                        if (Number.parseFloat(e.target.value) <= refundableAmount) setRefundError('');
                      }}
                      placeholder="0.00"
                      aria-invalid={refundAmountExceedsBalance}
                      aria-describedby="refund-amount-help refund-error"
                      className={`dashboard-control w-full pl-16 ${refundAmountExceedsBalance ? 'border-rose-400 ring-2 ring-rose-100' : ''}`}
                    />
                  </div>
                  <p id="refund-amount-help" className={`mt-2 text-xs ${refundAmountExceedsBalance ? 'font-semibold text-rose-700' : 'text-slate-500'}`}>
                    {refundAmountExceedsBalance ? 'This amount is higher than the remaining refundable balance.' : `Enter an amount from 0.01 to ${formatAmount(refundableAmount, refundModal.currency)}.`}
                  </p>
                </div>
              ) : null}

              <div className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <p><span className="font-semibold">Refunds affect money only.</span> Subscription access follows the customer’s current subscription status.</p>
              </div>

              <div>
                <label htmlFor="refund-reason" className="block text-sm font-medium text-slate-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  id="refund-reason"
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter refund reason..."
                  className="dashboard-control w-full resize-none"
                />
              </div>

              {refundError ? (
                <div id="refund-error" role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {refundError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => setRefundModal(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-transform hover:bg-slate-50 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRefund()}
                disabled={refunding || refundAmountExceedsBalance}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition-transform hover:bg-violet-700 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refunding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                {refunding ? 'Processing...' : (isPartialRefund ? `Refund ${formatAmount(refundAmount || '0', refundModal.currency)}` : 'Confirm Refund')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="payment-details-title" className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <ReceiptText className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="payment-details-title" className="text-base font-semibold text-slate-950">Payment details</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Billing, cancellation, and refund information for this payment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close payment details"
                onClick={() => setDetailsModal(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-950">Billing</h3>
                  <div className="mt-2">
                    {renderDetailRow('User', detailsModal.user_name || 'Not set')}
                    {renderDetailRow('Email', detailsModal.user_email || 'Not set')}
                    {renderDetailRow('Plan', detailsModal.plan_name || 'Not set')}
                    {renderDetailRow('Amount', formatAmount(detailsModal.amount, detailsModal.currency))}
                    {renderDetailRow('Gateway', detailsModal.gateway)}
                    {renderDetailRow('Payment status', detailsModal.status.replace('_', ' '))}
                    {renderDetailRow('Paid at', formatDate(detailsModal.paid_at))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-950">Cancellation</h3>
                  <div className="mt-2">
                    {renderDetailRow('Subscription status', detailsModal.subscription_status || 'Not set')}
                    {renderDetailRow('Cancel at period end', detailsModal.subscription_cancel_at_period_end)}
                    {renderDetailRow('Cancelled at', formatDate(detailsModal.subscription_cancelled_at))}
                    {renderDetailRow('Access ends at', formatDate(detailsModal.subscription_ends_at))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-950">Stripe references</h3>
                <div className="mt-2">
                  {renderDetailRow('Payment reference', detailsModal.reference)}
                  {renderDetailRow('Provider payment ID', detailsModal.provider_payment_id)}
                  {renderDetailRow('PaymentIntent', detailsModal.provider_payment_intent_id)}
                  {renderDetailRow('Charge', detailsModal.provider_charge_id)}
                  {renderDetailRow('Invoice', detailsModal.provider_invoice_id)}
                  {renderDetailRow('Subscription', detailsModal.gateway_subscription_id)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-950">Refund</h3>
                <div className="mt-2">
                  {renderDetailRow('Refund status', detailsModal.refund_status || 'Not refunded')}
                  {renderDetailRow('Refunded amount', formatAmount(detailsModal.refunded_amount || '0', detailsModal.currency))}
                  {renderDetailRow('Refundable amount', formatAmount(getRefundableAmount(detailsModal), detailsModal.currency))}
                  {getRefundCompletionMessage(detailsModal) ? (
                    renderDetailRow('Refund summary', getRefundCompletionMessage(detailsModal))
                  ) : null}
                  {detailsModal.latest_refund ? (
                    <>
                      {renderDetailRow('Latest refund ID', detailsModal.latest_refund.provider_refund_id)}
                      {renderDetailRow('Latest refund amount', formatAmount(detailsModal.latest_refund.amount, detailsModal.latest_refund.currency))}
                      {renderDetailRow('Latest refund status', detailsModal.latest_refund.status)}
                      {renderDetailRow('Refunded at', formatDate(detailsModal.latest_refund.refunded_at || undefined))}
                      {renderDetailRow('Refund reason', detailsModal.latest_refund.reason || 'Not set')}
                      {renderDetailRow('Refunded by', detailsModal.latest_refund.admin_email || detailsModal.latest_refund.admin_name || 'Not recorded')}
                    </>
                  ) : (
                    renderDetailRow('Latest refund', 'No refund recorded')
                  )}
                  {!canRefund(detailsModal) && !getRefundCompletionMessage(detailsModal) ? renderDetailRow('Refund note', getRefundUnavailableReason(detailsModal)) : null}
                </div>
              </div>

              {detailsModal.status === 'pending' && detailsModal.plan_id ? (
                <button
                  type="button"
                  onClick={() => {
                    setDetailsModal(null);
                    handlePendingCheckout(detailsModal);
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                >
                  Continue checkout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
