import { Check, HelpCircle, Shield, Sparkles, Star, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { plansService } from '../../services/plans.service';
import type { Plan } from '../../types/plan.types';

interface GroupedPlans {
  monthly: Plan[];
  yearly: Plan[];
}

function groupPlansByInterval(plans: Plan[]): GroupedPlans {
  return {
    monthly: plans.filter((p) => p.interval === 'month'),
    yearly: plans.filter((p) => p.interval === 'year'),
  };
}

function Crown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M3 20h18" />
      <path d="M5 16l-1 4" />
      <path d="M19 16l1 4" />
    </svg>
  );
}

function formatPrice(price: string): string {
  const num = Number.parseFloat(price);
  if (Number.isNaN(num)) return '$0';
  if (num === 0) return 'Free';
  if (num >= 1000) return `$${(num / 100).toFixed(0)}`;
  return `$${num.toFixed(0)}`;
}

function formatInterval(interval: string): string {
  return interval === 'year' ? '/year' : '/month';
}

function getPlanGradient(name: string): string {
  const key = name.toLowerCase();
  if (key === 'free') return 'from-slate-100 to-slate-200';
  if (key === 'pro') return 'from-indigo-500 to-indigo-600';
  if (key === 'enterprise') return 'from-amber-400 to-orange-500';
  return 'from-slate-100 to-slate-200';
}

function getPlanDisplayName(name: string): string {
  if (name === 'Pro') return 'Pro';
  if (name === 'Free') return 'Free';
  if (name === 'Enterprise') return 'Enterprise';
  return name;
}

const faqItems = [
  {
    question: 'Can I upgrade or downgrade my plan at any time?',
    answer: 'Yes, you can change your plan at any time. When upgrading, you\'ll get immediate access to new features. Downgrades take effect at the end of your billing cycle.',
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes, we offer a 14-day free trial on all paid plans. No credit card required. You can explore all Pro features risk-free.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans. Enterprise customers can also request invoice-based billing.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your dashboard. Your access will continue until the end of your billing period.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Security is our top priority. We use 256-bit encryption, SOC 2 compliance, and regular security audits. Enterprise plans include dedicated security features.',
  },
  {
    question: 'Do you offer custom enterprise pricing?',
    answer: 'Yes, for organizations with specific needs, we offer custom pricing. Contact our sales team and we\'ll create a tailored solution for you.',
  },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await plansService.getAll();
        if (isMounted) {
          setPlans(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load pricing plans.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const grouped = useMemo(() => groupPlansByInterval(plans), [plans]);
  const hasBothIntervals = grouped.monthly.length > 0 && grouped.yearly.length > 0;

  const displayPlans = useMemo(() => {
    const selected = billingInterval === 'month' ? grouped.monthly : grouped.yearly;
    if (selected.length > 0) return selected;
    return plans;
  }, [grouped, billingInterval, plans]);

  const sortedPlans = [...displayPlans].sort((a, b) => a.sort_order - b.sort_order);

  // Get all unique features for comparison table
  const allFeatures = useMemo(() => {
    const featureSet = new Set<string>();
    for (const plan of sortedPlans) {
      for (const feature of plan.features) {
        featureSet.add(feature);
      }
    }
    return Array.from(featureSet);
  }, [sortedPlans]);

  function planHasFeature(plan: Plan, feature: string): boolean {
    return plan.features.some((f) => f.toLowerCase().includes(feature.toLowerCase()) || feature.toLowerCase().includes(f.toLowerCase()));
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Simple, transparent pricing
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Simple pricing for{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                growing SaaS teams
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              Start free, scale with confidence. No hidden fees, no surprises — just the tools you need to build and grow.
            </p>
          </div>
        </div>
      </section>

      {/* Billing Toggle + Pricing Cards */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        {/* Billing Toggle */}
        {hasBothIntervals ? (
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center gap-0 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setBillingInterval('month')}
                className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  billingInterval === 'month'
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('year')}
                className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  billingInterval === 'year'
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Loading State */}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoadingSpinner label="Loading plans" size="lg" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm font-medium text-slate-300">{error}</p>
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm font-medium text-slate-300">No plans available yet. Check back soon.</p>
          </div>
        ) : (
          <>
            {/* Pricing Cards */}
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-6 xl:gap-8">
              {sortedPlans.map((plan) => {
                const isEnterprise = plan.name.toLowerCase() === 'enterprise';
                const isFree = plan.name.toLowerCase() === 'free';
                const isPro = plan.name.toLowerCase() === 'pro';

                return (
                  <div
                    key={plan.id}
                    className={`group relative flex flex-col rounded-3xl border transition-all duration-300 hover:-translate-y-1 ${
                      plan.is_popular
                        ? 'border-indigo-500/40 bg-indigo-500/5 shadow-xl shadow-indigo-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                    }`}
                  >
                    {/* Popular Badge */}
                    {plan.is_popular ? (
                      <div className="absolute -top-px left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/30">
                          <Star className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
                          Most Popular
                        </div>
                      </div>
                    ) : null}

                    {/* Card Header */}
                    <div className="px-8 pt-10 pb-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getPlanGradient(plan.name)}`}>
                          {isFree ? (
                            <Zap className="h-5 w-5 text-slate-700" aria-hidden="true" />
                          ) : isPro ? (
                            <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
                          ) : isEnterprise ? (
                            <Crown className="h-5 w-5 text-white" aria-hidden="true" />
                          ) : (
                            <Star className="h-5 w-5 text-white" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{getPlanDisplayName(plan.name)}</h3>
                          {plan.description ? (
                            <p className="text-sm text-slate-400">{plan.description}</p>
                          ) : null}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="text-5xl font-extrabold tracking-tight text-white">
                          {formatPrice(plan.price)}
                        </span>
                        {plan.price !== '0.00' ? (
                          <span className="text-lg font-semibold text-slate-400">
                            {formatInterval(plan.interval)}
                          </span>
                        ) : null}
                      </div>

                      {/* CTA Button */}
                      <div className="mt-8">
                        {isFree ? (
                          <Link
                            to="/register"
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm font-bold leading-none text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.96]"
                          >
                            Get started free
                          </Link>
                        ) : (
                          <Link
                            to="/register"
                            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-bold leading-none transition-all duration-200 active:scale-[0.96] ${
                              plan.is_popular
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400'
                                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {isEnterprise ? 'Contact sales' : 'Get started'}
                          </Link>
                        )}
                        <p className="mt-2 text-center text-xs text-slate-500">
                          {plan.name === 'Free' ? 'No credit card required' : 'Free 14-day trial. No credit card required.'}
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-8 border-t border-white/10" />

                    {/* Features */}
                    <div className="px-8 py-6 flex-1">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        What's included
                      </p>
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                            <span className="text-sm text-slate-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Limits Summary */}
                    {plan.limits && Object.keys(plan.limits).length > 0 ? (
                      <div className="px-8 pb-8">
                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {Object.entries(plan.limits).map(([key, value]) => (
                              <span key={key} className="capitalize">
                                {key.replace(/_/g, ' ')}:{' '}
                                <span className="font-semibold text-slate-300">
                                  {value === -1 || value === '-1' ? 'Unlimited' : String(value)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Feature Comparison Section */}
      {sortedPlans.length > 1 && !loading && !error ? (
        <section className="border-t border-white/5 bg-white/[0.02] py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Compare plans side by side
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Find the perfect plan for your team's needs
              </p>
            </div>

            <div className="mt-16 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 pr-8 text-left text-sm font-semibold text-slate-400 w-64">Feature</th>
                    {sortedPlans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 text-center text-sm font-bold text-white">
                        {getPlanDisplayName(plan.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature, index) => (
                    <tr key={feature} className={index % 2 === 0 ? 'border-b border-white/5' : 'border-b border-white/5 bg-white/[0.01]'}>
                      <td className="py-4 pr-8 text-sm text-slate-300">{feature}</td>
                      {sortedPlans.map((plan) => {
                        const has = planHasFeature(plan, feature);
                        return (
                          <td key={plan.id} className="px-6 py-4 text-center">
                            {has ? (
                              <Check className="mx-auto h-5 w-5 text-emerald-400" aria-hidden="true" />
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* Benefits Section */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Everything you need to scale
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              All plans include the core features your team needs to succeed
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'SOC 2 compliant infrastructure with 256-bit encryption and regular security audits.',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Work together in real-time with shared workspaces, comments, and task management.',
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Optimized infrastructure with global CDN ensures blazing fast load times everywhere.',
              },
            ].map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="rounded-2xl border border-white/10 bg-white/5 p-8 transition-all duration-200 hover:border-white/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-white">{benefit.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-white/5 bg-white/[0.02] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Everything you need to know about our plans and pricing
              </p>
            </div>

            <div className="mt-16 space-y-4">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-white/10 bg-white/5 transition-all duration-200 open:border-white/20 open:bg-white/[0.07]"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-semibold text-white transition-colors hover:text-indigo-400">
                    {item.question}
                    <HelpCircle className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-sm text-slate-400">{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative border-t border-white/5 py-24">
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Join thousands of teams already building with LaunchPad. Start your free trial today — no credit card required.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 text-sm font-bold leading-none text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-400 active:scale-[0.96]"
              >
                Start your free trial
              </Link>
              <Link
                to="/contact"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm font-bold leading-none text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.96]"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
