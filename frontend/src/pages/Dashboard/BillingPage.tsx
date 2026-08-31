import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  Package,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import {
  cancelNowUserSubscription,
  cancelUserSubscription,
  createStripeCheckoutSession,
  getBillingPlans,
  getCurrentBilling,
  type BillingPlan,
  type CurrentBillingResponse,
  type CurrentSubscription,
  type PaymentRecord,
} from '../../services/billing.service';
import { cn } from '../../utils/cn';

type SubscriptionStatus = string;

interface BadgeTone {
  className: string;
  icon: ReactNode;
}

function getStatusBadgeTone(status: SubscriptionStatus): BadgeTone {
  switch (status) {
    case 'active':
      return {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    case 'trialing':
      return {
        className: 'border-sky-200 bg-sky-50 text-sky-700',
        icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    case 'pending':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    case 'cancelled':
      return {
        className: 'border-rose-200 bg-rose-50 text-rose-700',
        icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    case 'expired':
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    case 'failed':
      return {
        className: 'border-rose-200 bg-rose-50 text-rose-700',
        icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
      };
    default:
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        icon: <Circle className="h-3.5 w-3.5" aria-hidden="true" />,
      };
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatAmount(amount: string, currency = 'USD'): string {
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) return amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

function numericAmount(plan?: Pick<BillingPlan, 'amount' | 'price'> | null): number {
  if (!plan) return 0;

  const source = plan.amount || plan.price || '0';
  const normalized = String(source).replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(normalized);

  return Number.isNaN(value) ? 0 : value;
}

function periodEndFor(subscription?: CurrentSubscription | null): string | undefined {
  return subscription?.ends_at || subscription?.current_period_end;
}

function isCancellingAtPeriodEnd(subscription?: CurrentSubscription | null): boolean {
  return Boolean(
    subscription
      && ['active', 'trialing'].includes(subscription.status)
      && (subscription.cancel_at_period_end || subscription.cancelled_at)
      && periodEndFor(subscription),
  );
}

function wasCancelledImmediately(subscription?: CurrentSubscription | null): boolean {
  return Boolean(
    subscription
      && subscription.status === 'cancelled'
      && subscription.ends_at
      && subscription.cancelled_at
      && subscription.ends_at === subscription.cancelled_at,
  );
}

function getSubscriptionIdentity(subscription?: CurrentSubscription | null, currentPlan?: BillingPlan | null) {
  if (!subscription || !currentPlan) {
    return {
      label: 'Free User',
      description: 'No paid subscription is active.',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: <Circle className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }

  if (wasCancelledImmediately(subscription)) {
    return {
      label: 'Cancelled Immediately',
      description: subscription.cancelled_at
        ? `Cancelled on ${formatDate(subscription.cancelled_at)}`
        : 'Subscription was cancelled immediately.',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }

  if (isCancellingAtPeriodEnd(subscription)) {
    return {
      label: `Cancels on ${formatDate(periodEndFor(subscription))}`,
      description: `${currentPlan.name} remains available through the current period.`,
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return {
      label: `${currentPlan.name} Active`,
      description: 'Paid subscriber',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }

  if (subscription.status === 'pending') {
    return {
      label: 'Pending Payment',
      description: `${currentPlan.name} is waiting for payment confirmation.`,
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }

  if (subscription.status === 'cancelled') {
    return {
      label: 'Cancelled',
      description: subscription.cancelled_at
        ? `Cancelled on ${formatDate(subscription.cancelled_at)}.`
        : 'Subscription is cancelled.',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }

  const tone = getStatusBadgeTone(subscription.status);

  return {
    label: formatStatusLabel(subscription.status),
    description: `${currentPlan.name} subscription`,
    tone: tone.className,
    icon: tone.icon,
  };
}

function SubscriptionBadge({ subscription, currentPlan }: { subscription?: CurrentSubscription | null; currentPlan?: BillingPlan | null }) {
  const identity = getSubscriptionIdentity(subscription, currentPlan);

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold', identity.tone)}>
      {identity.icon}
      {identity.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const tone = getStatusBadgeTone(status === 'paid' ? 'active' : status);

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold', tone.className)}>
      {tone.icon}
      {formatStatusLabel(status)}
    </span>
  );
}

function RefundStatusBadge({ refundStatus, refundedAmount, currency }: { refundStatus?: string; refundedAmount?: number; currency?: string }) {
  if (!refundStatus || !refundedAmount) return null;

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(refundedAmount);

  switch (refundStatus) {
    case 'refunded':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Refunded {formattedAmount}
        </span>
      );
    case 'partially_refunded':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
          <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
          Partially refunded {formattedAmount}
        </span>
      );
    case 'refund_pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Refund pending
        </span>
      );
    case 'refund_failed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Refund failed — contact support
        </span>
      );
    default:
      return null;
  }
}

function getPlanActionLabel(plan: BillingPlan, currentPlan?: BillingPlan | null): string {
  if (currentPlan?.id === plan.id) return 'Current Plan';
  if (numericAmount(plan) === 0) return 'Choose Free';
  if (!currentPlan) return 'Subscribe';

  const currentAmount = numericAmount(currentPlan);
  const nextAmount = numericAmount(plan);

  if (nextAmount > currentAmount) return 'Upgrade';
  if (nextAmount < currentAmount) return 'Downgrade';

  return 'Switch Plan';
}

export default function BillingPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<CurrentBillingResponse | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [billingActionsOpen, setBillingActionsOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelNowModalOpen, setCancelNowModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [retryingPaymentId, setRetryingPaymentId] = useState<number | null>(null);
  const [paymentRetryError, setPaymentRetryError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [billingData, plansData] = await Promise.all([
        getCurrentBilling(),
        getBillingPlans(),
      ]);
      setBilling(billingData);
      setPlans(plansData.data ?? []);
    } catch {
      setError('Unable to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, [loadData]);

  const handleConfirmCancelAtPeriodEnd = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelUserSubscription();
      setCancelModalOpen(false);
      await loadData();
    } catch {
      setCancelError('We could not cancel your subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmCancelNow = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelNowUserSubscription();
      setCancelNowModalOpen(false);
      await loadData();
    } catch {
      setCancelError('We could not cancel your subscription immediately. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectPlan = (plan: BillingPlan) => {
    if (plan.is_active) {
      navigate(`/dashboard/billing/checkout/${plan.id}`);
    }
  };

  const handleRetryPayment = async (payment: PaymentRecord) => {
    if (payment.status !== 'pending' || !payment.plan?.id || !payment.reference || retryingPaymentId !== null) return;

    setRetryingPaymentId(payment.id);
    setPaymentRetryError('');

    try {
      const response = await createStripeCheckoutSession(payment.plan.id, {
        retryPaymentReference: payment.reference,
      });

      if (!response.checkout_url) {
        throw new Error('Checkout URL was not returned.');
      }

      window.location.assign(response.checkout_url);
    } catch {
      setPaymentRetryError('We could not reopen this payment. Please try again or contact support.');
      setRetryingPaymentId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="max-w-md rounded-2xl border border-rose-100 bg-white px-8 py-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
            <AlertCircle className="h-6 w-6 text-rose-500" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const subscription = billing?.subscription;
  const currentPlan = billing?.current_plan;
  const paymentHistory = billing?.payment_history ?? [];
  const activeSubscription = subscription && ['active', 'trialing'].includes(subscription.status) ? subscription : null;
  const activeCurrentPlan = activeSubscription ? currentPlan : null;
  const hasActiveSubscription = Boolean(activeSubscription);
  const hasBillingActions = paymentHistory.length > 0 || hasActiveSubscription;
  const canManageBilling = billing?.can_manage_billing !== false;
  const periodEnd = periodEndFor(activeSubscription);
  const identity = getSubscriptionIdentity(activeSubscription, activeCurrentPlan);
  const isCancelScheduled = isCancellingAtPeriodEnd(activeSubscription);
  const isImmediateCancel = wasCancelledImmediately(activeSubscription);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Subscription and billing"
        description="Manage your plan, payments, and cancellation settings."
      />

      <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
        {currentPlan
          ? `Your account plan: ${currentPlan.name}. Organizations: ${billing?.organizations_used ?? 0} of ${billing?.organization_limit ?? 0}.`
          : 'Choose a plan to create your organizations.'}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <Crown className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>Current plan</CardTitle>
                  <SubscriptionBadge subscription={activeSubscription} currentPlan={activeCurrentPlan} />
                </div>
                <CardDescription>{identity.description}</CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasBillingActions && canManageBilling ? (
                <button
                  type="button"
                  onClick={() => setBillingActionsOpen(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                >
                  <CreditCard className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  Manage billing
                </button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {activeSubscription && activeCurrentPlan ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{activeCurrentPlan.name}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatAmount(activeCurrentPlan.amount || activeCurrentPlan.price, activeCurrentPlan.currency)}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    / {activeCurrentPlan.interval === 'year' ? 'year' : 'month'}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Period start</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(activeSubscription.starts_at || activeSubscription.current_period_start)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isImmediateCancel ? 'Access ended on' : isCancelScheduled ? 'Access ends on' : 'Period end'}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(periodEnd)}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
                  <Circle className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Free User</p>
                  <p className="text-sm text-slate-500">Choose a plan when you are ready to unlock paid features.</p>
                </div>
              </div>
              <SubscriptionBadge subscription={activeSubscription} currentPlan={activeCurrentPlan} />
            </div>
          )}

          {isImmediateCancel && subscription ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              <div>
                <p className="font-semibold">Cancelled Immediately</p>
                <p className="mt-0.5 text-rose-700">
                  Cancelled on {formatDate(subscription.cancelled_at)}. Access ended on {formatDate(subscription.ends_at)}.
                </p>
                {(subscription.current_period_start && subscription.current_period_end) ? (
                  <p className="mt-0.5 text-rose-600">
                    Original billing period: {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {isCancelScheduled && !isImmediateCancel ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              <p>
                Your subscription is scheduled to cancel on {formatDate(periodEnd)}.
                You will have access until that date.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                <Package className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Available plans</CardTitle>
                <CardDescription>Choose the plan that fits the workspace.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <EmptyState
                icon={<Package className="h-6 w-6" aria-hidden="true" />}
                title="No plans available"
                description="Check back later for available subscription plans."
              />
            ) : (
              <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrentPlan = activeCurrentPlan?.id === plan.id;
                  const actionLabel = getPlanActionLabel(plan, activeCurrentPlan);
                  const isDowngrade = actionLabel === 'Downgrade';
                  const isUpgrade = actionLabel === 'Upgrade';

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => !isCurrentPlan && handleSelectPlan(plan)}
                      disabled={!plan.is_active || isCurrentPlan || !canManageBilling}
                      aria-pressed={isCurrentPlan}
                      className={cn(
                        'group relative flex h-full min-h-[24rem] flex-col overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2',
                        isCurrentPlan
                          ? 'cursor-default border-emerald-300 bg-gradient-to-b from-emerald-50/80 to-white shadow-lg shadow-emerald-100/60 ring-2 ring-emerald-200/70'
                          : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60',
                        (!plan.is_active || !canManageBilling) && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      {isCurrentPlan ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400"
                        />
                      ) : null}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold tracking-tight text-slate-900">{plan.name}</h3>
                          {plan.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{plan.description}</p>
                          ) : null}
                        </div>
                        {isCurrentPlan ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm shadow-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Active
                          </span>
                        ) : plan.is_popular ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                            Popular
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 flex items-baseline gap-1">
                        <span
                          className={cn(
                            'text-3xl font-bold tracking-tight',
                            isCurrentPlan ? 'text-emerald-700' : 'text-slate-950',
                          )}
                        >
                          {formatAmount(plan.amount || plan.price, plan.currency)}
                        </span>
                        <span className="text-sm font-medium text-slate-500">
                          / {plan.interval === 'year' ? 'year' : 'month'}
                        </span>
                      </div>

                      <div className="mt-6 flex-1">
                        {plan.features && plan.features.length > 0 ? (
                          <ul className="space-y-2.5">
                            {plan.features.slice(0, 4).map((feature) => (
                              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                                <span
                                  className={cn(
                                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                                    isCurrentPlan ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-50 text-emerald-500',
                                  )}
                                >
                                  <ShieldCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                                </span>
                                <span className="leading-5">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-400">No features listed.</p>
                        )}
                      </div>

                      <div className="mt-6 pt-2">
                        <span
                          className={cn(
                            'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition',
                            isCurrentPlan
                              ? 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                              : isDowngrade
                                ? 'border border-slate-200 bg-white text-slate-700 group-hover:border-slate-300 group-hover:bg-slate-50'
                                : isUpgrade
                                  ? 'bg-slate-950 text-white shadow-sm shadow-slate-300 group-hover:bg-slate-800'
                                  : 'bg-slate-950 text-white shadow-sm shadow-slate-300 group-hover:bg-slate-800',
                          )}
                        >
                          {actionLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="payment-history" className="mt-8 scroll-mt-24">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ReceiptText className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Payment history</CardTitle>
                <CardDescription>Payments made by your signed-in account, across your organizations.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {paymentRetryError ? (
              <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {paymentRetryError}
              </div>
            ) : null}
            {paymentHistory.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" aria-hidden="true" />}
                title="No payments yet"
                description="Your payment history will appear here after the first transaction."
              />
            ) : (
              <div className="dashboard-table-shell">
                <div className="dashboard-table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="whitespace-nowrap text-sm font-medium text-slate-900">
                            {payment.reference ? (
                              <span className="font-mono text-xs text-slate-700">{payment.reference}</span>
                            ) : (
                              <span className="text-slate-400">Not set</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-sm text-slate-700">
                            {payment.plan?.name ?? <span className="text-slate-400">Not set</span>}
                          </td>
                          <td className="whitespace-nowrap text-sm font-bold text-slate-950">
                            {formatAmount(payment.amount, payment.currency)}
                          </td>
                          <td className="whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <PaymentStatusBadge status={payment.status} />
                              {payment.refund_status ? (
                                <RefundStatusBadge
                                  refundStatus={payment.refund_status}
                                  refundedAmount={payment.refunded_amount}
                                  currency={payment.currency}
                                />
                              ) : null}
                              {payment.status === 'pending' && payment.plan?.id && payment.reference ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRetryPayment(payment)}
                                  disabled={retryingPaymentId !== null}
                                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {retryingPaymentId === payment.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  {retryingPaymentId === payment.id ? 'Opening checkout...' : 'Retry payment'}
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="whitespace-nowrap text-sm text-slate-600">
                            {formatDate(payment.paid_at || payment.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {billingActionsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="billing-actions-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <CreditCard className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="billing-actions-title" className="text-base font-semibold text-slate-950">Billing details</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Review subscription details and available billing actions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close billing details"
                onClick={() => setBillingActionsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {activeSubscription && activeCurrentPlan ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">Plan</span>
                    <span className="font-semibold text-slate-900">{activeCurrentPlan.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold text-slate-900">
                      {formatAmount(activeCurrentPlan.amount || activeCurrentPlan.price, activeCurrentPlan.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">Billing period</span>
                    <span className="font-semibold text-slate-900">
                      {formatDate(activeSubscription.current_period_start)} to {formatDate(activeSubscription.current_period_end)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No active paid plan is currently attached to this account.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {paymentHistory.length > 0 ? (
                  <a
                    href="#payment-history"
                    onClick={() => setBillingActionsOpen(false)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                  >
                    <ReceiptText className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                    View payment history
                  </a>
                ) : null}

                {hasActiveSubscription && !isCancelScheduled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBillingActionsOpen(false);
                      setCancelError('');
                      setCancelModalOpen(true);
                    }}
                    disabled={cancelling}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Clock className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                    Cancel at period end
                  </button>
                ) : null}

                {hasActiveSubscription ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBillingActionsOpen(false);
                      setCancelError('');
                      setCancelNowModalOpen(true);
                    }}
                    disabled={cancelling}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                    Cancel immediately
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel at Period End Modal */}
      {cancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="cancel-subscription-title" className="text-base font-semibold text-slate-950">Cancel subscription at period end?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {periodEnd
                      ? `Your subscription will remain active until ${formatDate(periodEnd)}. Keep access until then.`
                      : 'Your subscription cancellation will be scheduled.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close cancellation modal"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                You can keep using the current plan during the remaining billing period. Payment history and subscription records stay available in your dashboard.
              </div>
              {cancelError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {cancelError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCancelAtPeriodEnd()}
                disabled={cancelling}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Clock className="h-4 w-4" aria-hidden="true" />}
                {cancelling ? 'Cancelling...' : 'Cancel at Period End'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel Immediately Modal */}
      {cancelNowModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-now-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="cancel-now-title" className="text-base font-semibold text-slate-950">Cancel subscription immediately?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    This will cancel your subscription now and your access will end immediately. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close immediate cancellation modal"
                onClick={() => setCancelNowModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-4">
              {activeCurrentPlan ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Plan</span>
                    <span className="font-semibold text-slate-900">{activeCurrentPlan.name}</span>
                  </div>
                  {activeSubscription?.current_period_start && activeSubscription?.current_period_end ? (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Current billing period</span>
                      <span className="font-semibold text-slate-900">
                        {formatDate(activeSubscription.current_period_start)} to {formatDate(activeSubscription.current_period_end)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Access will end</span>
                    <span className="font-semibold text-rose-700">Today</span>
                  </div>
                </div>
              ) : null}

              {cancelError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {cancelError}
                </div>
              ) : null}

              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                <strong>Warning:</strong> This action cannot be undone. Your access will end immediately. No refund will be issued automatically.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelNowModalOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCancelNow()}
                disabled={cancelling}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                {cancelling ? 'Cancelling...' : 'Cancel Immediately'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
