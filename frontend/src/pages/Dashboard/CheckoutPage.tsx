import { AlertCircle, ArrowLeft, CreditCard, Crown, Loader2, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import { createCheckoutSession, createStripeCheckoutSession, getBillingPlans, type BillingPlan } from '../../services/billing.service';
import {
  getPaymentErrorMessage,
  logPaymentError,
} from '../../utils/paymentErrors';

function formatAmount(amount: string, currency = 'USD'): string {
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

export default function CheckoutPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const autoCheckoutPlanIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPlan = async () => {
      setLoading(true);
      try {
        const response = await getBillingPlans();
        const found = (response.data ?? []).find(
          (p) => p.id === Number(planId)
        );
        if (!cancelled) {
          if (found) {
            setPlan(found);
          } else {
            setError('Selected plan not found.');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load plan details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadPlan();
    return () => { cancelled = true; };
  }, [planId]);

  const handleSubscribe = useCallback(async () => {
    if (!plan) return;
    setSubscribing(true);
    setError('');
    setSuccess('');

    try {
      const amount = Number.parseFloat(plan.amount || '0');
      
      // Free plan
      if (amount === 0) {
        await createCheckoutSession(plan.id);
        setSuccess('Subscribed to free plan successfully!');
        setTimeout(() => navigate('/dashboard/billing'), 1500);
        return;
      }

      // Paid plan - create Stripe Checkout Session
      const response = await createStripeCheckoutSession(plan.id);

      if (response.checkout_url) {
        window.location.assign(response.checkout_url);
        return;
      }

      setError('Could not start checkout. Please try again.');
    } catch (checkoutError) {
      logPaymentError(checkoutError);
      setError(getPaymentErrorMessage(checkoutError));
    } finally {
      setSubscribing(false);
    }
  }, [plan, navigate]);

  useEffect(() => {
    if (!plan || autoCheckoutPlanIdRef.current === planId) return;

    const amount = Number.parseFloat(plan.amount || plan.price || '0');

    if (amount > 0) {
      autoCheckoutPlanIdRef.current = planId ?? String(plan.id);
      void handleSubscribe();
    }
  }, [handleSubscribe, plan, planId]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-3 text-sm text-slate-500">Loading plan details...</p>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="mx-auto max-w-lg pt-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/billing')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to billing
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFree = plan && Number.parseFloat(plan.amount || '0') === 0;

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <button
        type="button"
        onClick={() => navigate('/dashboard/billing')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to billing
      </button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <Crown className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Complete Your Subscription</CardTitle>
              <CardDescription>Review your plan and confirm.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {plan && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatAmount(plan.amount || plan.price, plan.currency)}
                  </p>
                  <p className="text-xs text-slate-500">
                    / {plan.interval === 'year' ? 'year' : 'month'}
                  </p>
                </div>
              </div>

              {plan.features && plan.features.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    What's included
                  </p>
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                {success}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {error}
              </div>
            </div>
          )}

          {isFree ? (
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={subscribing}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {subscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              )}
              {subscribing ? 'Activating...' : 'Activate Free Plan'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={subscribing}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {subscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              )}
              {subscribing ? 'Redirecting to checkout...' : 'Subscribe with Stripe'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/dashboard/billing')}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Return to billing
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
