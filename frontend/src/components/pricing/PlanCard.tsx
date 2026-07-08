import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { createCheckoutSession } from '../../services/billing.service';
import {
  getPaymentErrorMessage,
  logPaymentError,
} from '../../utils/paymentErrors';

export interface Plan {
  id: number;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  billing_interval?: 'month' | 'year' | null;
}

interface PlanCardProps {
  plan: Plan;
  features?: string[];
  isPopular?: boolean;
}

function formatAmount(amount: string, currency: string): string {
  const value = Number.parseFloat(amount);

  if (Number.isNaN(value)) {
    return `${amount} ${currency.toUpperCase()}`;
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value);
}

function formatBillingInterval(interval: Plan['billing_interval']): string {
  if (interval === 'year') return 'per year';
  if (interval === 'month') return 'per month';
  return 'one time';
}

export default function PlanCard({
  plan,
  features = [],
  isPopular = false,
}: PlanCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorId = useId();

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    // Not logged in: redirect to login with redirect param
    if (!user) {
      const amount = Number.parseFloat(plan.amount);
      if (amount === 0) {
        navigate('/register');
      } else {
        navigate(`/login?redirect=/pricing&plan_id=${plan.id}`);
      }
      setLoading(false);
      return;
    }

    const amount = Number.parseFloat(plan.amount);
    // Free plan
    if (amount === 0) {
      try {
        await createCheckoutSession(plan.id);
        navigate('/dashboard/billing');
      } catch (checkoutError) {
        logPaymentError(checkoutError);
        setError(getPaymentErrorMessage(checkoutError));
      }
      setLoading(false);
      return;
    }

    navigate(`/dashboard/billing/checkout/${plan.id}`);
    setLoading(false);
  };

  return (
    <article
      className={`flex h-full flex-col rounded-lg border p-6 shadow-sm ${
        isPopular
          ? 'border-cyan-400 bg-cyan-400/10 shadow-cyan-950/40'
          : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
          {plan.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {plan.description}
            </p>
          ) : null}
        </div>
        {isPopular ? (
          <span className="rounded-md bg-cyan-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
            Popular
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        <p className="text-4xl font-bold tracking-tight text-white">
          {formatAmount(plan.amount, plan.currency)}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-400">
          {plan.currency.toUpperCase()} {formatBillingInterval(plan.billing_interval)}
        </p>
      </div>

      {features.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-8">
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          aria-busy={loading}
          aria-describedby={error ? errorId : undefined}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-cyan-400 px-3.5 text-sm font-bold leading-none text-slate-950 transition hover:bg-cyan-300 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Opening...
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Subscribe
            </>
          )}
        </button>
      </div>
    </article>
  );
}
