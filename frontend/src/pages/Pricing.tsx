import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PlanCard, { type Plan as CheckoutPlan } from '../components/pricing/PlanCard';
import { plansService } from '../services/plans.service';
import type { Plan as ApiPlan } from '../types/plan.types';

type ApiPlanWithPaymentFields = ApiPlan & {
  amount?: string;
  currency?: string;
  billing_interval?: 'month' | 'year' | null;
};

function toCheckoutPlan(plan: ApiPlan): CheckoutPlan {
  const paymentPlan = plan as ApiPlanWithPaymentFields;

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? undefined,
    amount: paymentPlan.amount ?? plan.price,
    currency: paymentPlan.currency ?? 'USD',
    billing_interval: paymentPlan.billing_interval ?? plan.interval ?? null,
  };
}

export default function Pricing() {
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await plansService.getAll();

        if (isMounted) {
          setPlans(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load pricing plans. Please try again soon.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedPlans = useMemo(
    () =>
      plans
        .filter((plan) => plan.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [plans],
  );

  return (
    <section className="public-container min-h-[calc(100vh-4rem)] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="public-kicker">
          Pricing
        </p>
        <h1 className="mt-5 text-5xl font-black tracking-[-.06em] text-white sm:text-7xl">
          Pick your <span className="text-[#d7f36b]">starting line.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
          Pick a plan and continue to a secure hosted checkout when you are
          ready to subscribe.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <LoadingSpinner label="Loading plans" size="lg" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mx-auto mt-12 max-w-xl rounded-lg border border-red-400/30 bg-red-500/10 p-6 text-center"
        >
          <p className="text-sm font-medium text-red-100">{error}</p>
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="mx-auto mt-12 max-w-xl rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center">
          <p className="text-sm font-medium text-slate-300">
            No plans are available yet. Please check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={toCheckoutPlan(plan)}
              features={plan.features}
              isPopular={plan.is_popular}
            />
          ))}
        </div>
      )}
    </section>
  );
}
