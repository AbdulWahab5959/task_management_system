import { Check, HelpCircle, ListChecks, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import { plansService } from '../../services/plans.service';
import type { Plan } from '../../types/plan.types';

const faqItems = [
  ['Can I change plans later?', 'Yes. Choose a different plan from your dashboard. Any paid change follows the checkout flow and provider confirmation.'],
  ['What does a plan cover?', 'Each subscription applies to one workspace. Prices, intervals, features, and workspace capacity are shown here before checkout.'],
  ['What payment methods are available?', 'Paid checkout is handled through the configured payment provider. Available methods are shown during checkout.'],
  ['Can I cancel my subscription?', 'You can cancel from your dashboard. Access may continue through the current billing period depending on the cancellation action.'],
];

function formatPrice(price: string, currency = 'USD') {
  const value = Number.parseFloat(price);
  if (Number.isNaN(value) || value === 0) return 'Free';
  const symbol = currency.toUpperCase() === 'EUR' ? '€' : currency.toUpperCase() === 'GBP' ? '£' : '$';
  return `${symbol}${value >= 1000 ? (value / 100).toFixed(0) : value.toFixed(0)}`;
}

function limitValue(plan: Plan, key: string) {
  const value = plan.limits?.[key];
  if (value === undefined || value === null || value === -1 || value === '-1' || value === 'unlimited') return 'Unlimited';
  return String(value);
}

function planLabel(name: string) {
  return name.replace(/\s+(monthly|yearly)$/i, '');
}

function managementFeatures(plan: Plan) {
  const name = plan.name.toLowerCase();
  return [
    'Project planning and status tracking',
    'Task creation and assignment',
    'Shared workspace dashboard',
    plan.limits?.team_members !== undefined ? 'Team member access' : 'Team collaboration',
    name.includes('business') || name.includes('enterprise') ? 'Advanced project management' : 'Email support',
  ];
}

function workspaceDescription(plan: Plan) {
  const name = plan.name.toLowerCase();
  if (name.includes('enterprise')) return 'For teams managing larger portfolios and more structured delivery.';
  if (name.includes('pro')) return 'For growing teams that need more room for projects and collaboration.';
  return 'A focused starting point for organizing your team’s work.';
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  useEffect(() => {
    let mounted = true;
    plansService.getAll().then((response) => { if (mounted) setPlans(response.data); }).catch(() => { if (mounted) setError('Unable to load pricing plans.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const displayPlans = useMemo(() => {
    const selected = plans.filter((plan) => plan.interval === billingInterval).sort((a, b) => a.sort_order - b.sort_order);
    return selected.length > 0 ? selected : [...plans].sort((a, b) => a.sort_order - b.sort_order);
  }, [plans, billingInterval]);

  const hasBothIntervals = plans.some((plan) => plan.interval === 'month') && plans.some((plan) => plan.interval === 'year');

  return <div className="min-h-screen bg-[#0b0d0c]">
    <section className="relative overflow-hidden border-b border-white/10 px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32"><div className="public-container grid gap-10 lg:grid-cols-[1fr_.7fr] lg:items-end"><div><p className="public-kicker">Plans for the work ahead</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.95] tracking-[-.07em] text-white sm:text-7xl">Simple pricing for<br /><span className="text-[#d7f36b]">growing teams.</span></h1></div><p className="max-w-sm text-lg leading-8 text-slate-300">Choose the plan that fits the projects, tasks, and team members your workspace needs.</p></div></section>
    <section className="public-container px-5 py-16 sm:px-8 sm:py-24">{hasBothIntervals ? <div className="mb-12 flex justify-center"><div className="inline-flex border border-white/10 p-1"><button type="button" onClick={() => setBillingInterval('month')} className={`px-5 py-2 text-sm font-bold ${billingInterval === 'month' ? 'bg-[#d7f36b] text-[#0b0d0c]' : 'text-slate-400'}`}>Monthly</button><button type="button" onClick={() => setBillingInterval('year')} className={`px-5 py-2 text-sm font-bold ${billingInterval === 'year' ? 'bg-[#d7f36b] text-[#0b0d0c]' : 'text-slate-400'}`}>Yearly</button></div></div> : null}
      {loading ? <ProfessionalLoader label="Loading plans" detail="Preparing available plans" /> : error ? <div className="public-panel mx-auto max-w-lg p-8 text-center text-sm text-slate-300">{error}</div> : displayPlans.length === 0 ? <div className="public-panel mx-auto max-w-lg p-8 text-center text-sm text-slate-300">No plans available yet. Check back soon.</div> : <div className="grid gap-5 lg:grid-cols-3">{displayPlans.map((plan) => { const isPopular = plan.is_popular; return <article key={plan.id} className={`public-panel relative flex flex-col p-6 sm:p-8 ${isPopular ? 'border-[#d7f36b]/70' : ''}`}>{isPopular ? <span className="absolute right-5 top-5 border border-[#d7f36b]/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#d7f36b]">Most popular</span> : null}<div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center border border-[#d7f36b]/40 text-[#d7f36b]"><Sparkles className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-white">{planLabel(plan.name)}</h2><p className="text-xs text-slate-500">One workspace</p></div></div><p className="mt-8 text-5xl font-black tracking-tight text-white">{formatPrice(plan.price, plan.currency)}<span className="ml-1 text-sm font-medium text-slate-500">{plan.price !== '0.00' ? `/${plan.interval}` : ''}</span></p><p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{workspaceDescription(plan)}</p><Link to="/register" className={`mt-7 inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm font-bold ${isPopular ? 'bg-[#d7f36b] text-[#0b0d0c]' : 'border border-white/15 text-white hover:border-[#d7f36b] hover:text-[#d7f36b]'}`}>{plan.price === '0.00' ? 'Get started free' : 'Get started'}</Link><div className="mt-8 border-t border-white/10 pt-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Workspace capacity</p><div className="mt-4 grid gap-3"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-400"><ListChecks className="h-4 w-4 text-[#d7f36b]" /> Projects</span><strong className="text-white">{limitValue(plan, 'projects')}</strong></div><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-400"><UsersRound className="h-4 w-4 text-[#d7f36b]" /> Team members</span><strong className="text-white">{limitValue(plan, 'team_members')}</strong></div></div></div><ul className="mt-7 space-y-3 border-t border-white/10 pt-6">{managementFeatures(plan).map((feature) => <li key={feature} className="flex items-start gap-3 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d7f36b]" />{feature}</li>)}</ul></article>; })}</div>}
    </section>
    <section className="border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28"><div className="public-container grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="public-kicker">Questions, answered</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] text-white sm:text-5xl">Make the right<br />plan with confidence.</h2></div><div className="space-y-3">{faqItems.map(([question, answer]) => <details key={question} className="border-b border-white/10 py-5"><summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-bold text-white">{question}<HelpCircle className="h-5 w-5 shrink-0 text-[#d7f36b]" /></summary><p className="max-w-2xl pt-3 text-sm leading-6 text-slate-400">{answer}</p></details>)}</div></div></section>
  </div>;
}
