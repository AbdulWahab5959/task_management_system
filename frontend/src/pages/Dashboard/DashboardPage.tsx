import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Check,
  CircleAlert,
  CreditCard,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';
import StatsCard from '../../components/dashboard/StatsCard';
import TenantOnboarding from '../../components/dashboard/TenantOnboarding';
import PendingInvitationsOnboarding from '../../components/dashboard/PendingInvitationsOnboarding';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { getCurrentBilling, type CurrentBillingResponse } from '../../services/billing.service';
import { tenantDashboardService } from '../../services/tenant-dashboard.service';
import type { TenantDashboardSummary } from '../../types/tenant-dashboard.types';

function getFirstName(name?: string) {
  return name?.split(' ').filter(Boolean)[0] ?? 'there';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatRole(role?: string | null) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
}

function formatIndustry(industry?: string | null) {
  return industry ? industry.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not configured';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeTenant, loading: tenantsLoading, pendingInvitations, pendingInvitationsLoading } = useTenant();
  const [billing, setBilling] = useState<CurrentBillingResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  useEffect(() => {
    if (activeTenant || user?.role === 'admin' || user?.role === 'super_admin') return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setBillingLoading(true);
    });

    void getCurrentBilling()
      .then((currentBilling) => {
        if (!cancelled) setBilling(currentBilling);
      })
      .catch(() => {
        if (!cancelled) setBilling(null);
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTenant, user?.role]);

  useEffect(() => {
    let cancelled = false;
    const tenantId = activeTenant?.id;
    const version = ++requestVersion.current;

    queueMicrotask(() => {
      if (cancelled) return;
      setSummary(null);
      setError('');
      setLoading(Boolean(tenantId));
    });

    if (!tenantId) return () => { cancelled = true; };

    void tenantDashboardService.getSummary()
      .then((nextSummary) => {
        if (!cancelled && version === requestVersion.current && nextSummary.tenant.id === tenantId) setSummary(nextSummary);
      })
      .catch(() => {
        if (!cancelled && version === requestVersion.current) setError('Unable to load this organization overview.');
      })
      .finally(() => {
        if (!cancelled && version === requestVersion.current) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTenant?.id]);

  const reload = () => {
    if (!activeTenant) return;
    const version = ++requestVersion.current;
    setSummary(null);
    setError('');
    setLoading(true);
    void tenantDashboardService.getSummary()
      .then((nextSummary) => {
        if (version === requestVersion.current && nextSummary.tenant.id === activeTenant.id) setSummary(nextSummary);
      })
      .catch(() => {
        if (version === requestVersion.current) setError('Unable to load this organization overview.');
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
  };

  if (!activeTenant) {
    if (tenantsLoading) {
      return <div className="space-y-5" role="status" aria-label="Loading organizations"><div className="h-10 w-2/5 animate-pulse rounded-lg bg-slate-100" /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div><div className="h-72 animate-pulse rounded-xl bg-slate-100" /></div>;
    }

    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-indigo-500" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-semibold text-slate-950">Welcome to your LaunchStack dashboard</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Use the administration tools to manage plans, users, billing, and platform activity.</p>
            <Link to="/dashboard/admin" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              Open admin tools
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (pendingInvitationsLoading) {
      return <div className="flex min-h-96 items-center justify-center"><LoadingSpinner label="Checking your invitations" /></div>;
    }

    if (pendingInvitations.length > 0) {
      return <PendingInvitationsOnboarding invitations={pendingInvitations} />;
    }

    if (billingLoading) {
      return <div className="flex min-h-96 items-center justify-center"><LoadingSpinner label="Checking your workspace plan" /></div>;
    }

    const hasActiveSubscription = Boolean(
      billing?.subscription && ['active', 'trialing'].includes(billing.subscription.status),
    );

    if (!hasActiveSubscription) {
      return (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <CreditCard className="h-10 w-10 text-indigo-500" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-semibold text-slate-950">Choose a plan to start your workspace</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Select a LaunchStack plan before creating your organization.</p>
            <Link to="/dashboard/billing" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              View Plans
            </Link>
          </CardContent>
        </Card>
      );
    }

    return <TenantOnboarding />;
  }

  if (loading && !summary) {
    return <div className="flex min-h-96 items-center justify-center"><LoadingSpinner label="Loading organization overview" /></div>;
  }

  if (error && !summary) {
    return (
      <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <CircleAlert className="h-8 w-8 text-amber-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Could not load the organization overview</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <button type="button" onClick={reload} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          </CardContent>
      </Card>
    );
  }

  if (!summary) return null;
  const profile = summary.organization_profile;
  const subscription = summary.billing.current_subscription;
  const isSuperAdmin = user?.role === 'super_admin';
  const organizationLimit = summary.billing.organization_limit === 'unlimited' ? null : Number(summary.billing.organization_limit);
  const isOverOrganizationLimit = organizationLimit !== null && summary.billing.organizations_used > organizationLimit;
  const organizationsOverLimit = isOverOrganizationLimit ? summary.billing.organizations_used - (organizationLimit ?? 0) : 0;
  const setupChecklist = isSuperAdmin
    ? summary.setup_checklist.filter((item) => item.key !== 'billing')
    : summary.setup_checklist;

  return (
    <>
      <PageHeader
        eyebrow="Organization dashboard"
        title={`Welcome back, ${getFirstName(user?.name)}`}
        description={`${summary.tenant.name} workspace overview and recommended next steps.`}
        action={<button type="button" onClick={reload} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700"><Building2 className="h-4 w-4" aria-hidden="true" /> {summary.tenant.name}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold capitalize text-emerald-700">{summary.tenant.status}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{formatRole(summary.tenant.current_user_role)}</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Profile completion" value={`${profile.completion_percent}%`} description={`${profile.missing_fields.length} fields remaining`} icon={<Building2 />} variant="indigo" />
        <StatsCard title="Active team" value={String(summary.team.members_total)} description={`${summary.team.admins} admins, ${summary.team.members} members`} icon={<Users />} variant="violet" />
        <StatsCard title="Pending invitations" value={String(summary.team.pending_invitations)} description={summary.team.pending_invitations ? 'Ready for review' : 'No invitations waiting'} icon={<MailPlus />} variant="amber" />
        <StatsCard title="Your subscription" value={subscription?.plan_name ?? 'Not available'} description={subscription ? `${subscription.status} · ${summary.billing.subscription_scope}-scoped` : 'Billing information is not available yet.'} icon={<CreditCard />} variant={subscription ? 'emerald' : 'rose'} />
      </div>

      {isSuperAdmin ? <div role="status" className="mt-5 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Platform administration mode</p><p className="mt-0.5 text-indigo-800">You are viewing this organization with platform-wide access. Customer plan limits and organization creation rules do not apply to your super-admin account.</p></div><Link to="/dashboard/organizations" className="shrink-0 font-semibold text-indigo-700 underline underline-offset-2">Manage organizations</Link></div> : isOverOrganizationLimit ? <div role="alert" className="mt-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Your account is over the current organization limit.</p><p className="mt-0.5">You have {summary.billing.organizations_used} active organizations, but your {subscription?.plan_name ?? 'current'} plan allows {organizationLimit}. New organizations are blocked until you upgrade or archive {organizationsOverLimit} organization{organizationsOverLimit === 1 ? '' : 's'}.</p></div><Link to="/dashboard/billing" className="shrink-0 font-semibold text-amber-800 underline underline-offset-2">Review plan</Link></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <Card>
          <CardHeader><CardTitle>Organization overview</CardTitle><CardDescription>Profile details for the active organization.</CardDescription></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Industry" value={formatIndustry(profile.industry)} />
              <Detail label="Website" value={profile.website ?? 'Not configured'} href={profile.website ?? undefined} />
              <Detail label="Description" value={profile.description ?? 'Not configured'} />
              <Detail label="Contact email" value={profile.contact_email ?? 'Not configured'} />
              <Detail label="Phone" value={profile.phone ?? 'Not configured'} />
              <Detail label="Country" value={profile.country ?? 'Not configured'} />
              <Detail label="Timezone" value={profile.timezone} />
              <Detail label="Currency" value={profile.currency} />
              <Detail label="Created" value={formatDate(summary.tenant.created_at)} />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
              <div><p className="text-sm font-semibold text-indigo-950">{profile.completion_percent}% complete</p><p className="mt-0.5 text-xs text-indigo-700">{profile.missing_fields.length ? `Add ${profile.missing_fields.join(', ')} to finish your profile.` : 'Your organization profile is complete.'}</p></div>
              <Link to="/dashboard/organizations" className="shrink-0 text-sm font-semibold text-indigo-700 hover:text-indigo-900">Manage organization</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Setup checklist</CardTitle><CardDescription>Recommended steps for this workspace.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {setupChecklist.map((item) => <div key={item.key} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{item.completed ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-current" />}</span><span className={`text-sm ${item.completed ? 'text-slate-500 line-through' : 'font-semibold text-slate-800'}`}>{item.label}</span></div>)}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Team overview</CardTitle><CardDescription>Active members and pending invitations are counted separately.</CardDescription></CardHeader>
          <CardContent><div className="grid grid-cols-3 gap-3"><Metric label="Owners" value={summary.team.owners} /><Metric label="Admins" value={summary.team.admins} /><Metric label="Members" value={summary.team.members} /></div><p className="mt-4 text-sm text-slate-600">{summary.team.members_total <= 1 ? 'Invite your first team member.' : `${summary.team.members_total} active members in this organization.`}</p><Link to="/dashboard/team" className="mt-4 inline-flex items-center justify-center text-sm font-semibold text-indigo-700 hover:text-indigo-900">Manage team</Link></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{isSuperAdmin ? 'Platform administration' : 'Your current subscription'}</CardTitle><CardDescription>{isSuperAdmin ? 'Organization plans and billing are managed from the platform administration tools.' : 'Your plan and payment belong to your account and cover your organizations.'}</CardDescription></CardHeader>
          <CardContent>{subscription ? <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Plan</span><span className="text-sm font-semibold text-slate-900">{subscription.plan_name ?? 'Unnamed plan'}</span></div><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Organizations</span><span className="text-sm font-semibold text-slate-900">{summary.billing.organizations_used} of {summary.billing.organization_limit}</span></div><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Status</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">{subscription.status}</span></div>{subscription.current_period_end ? <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Current period ends</span><span className="text-sm font-semibold text-slate-900">{formatDate(subscription.current_period_end)}</span></div> : null}<div className="border-t border-slate-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chatbot features</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{summary.billing.plan_features.map((feature) => <li key={feature}>• {feature}</li>)}</ul></div></div> : <p className="text-sm text-slate-500">Billing information is not available yet.</p>}<Link to="/dashboard/billing" className="mt-5 inline-flex items-center justify-center text-sm font-semibold text-indigo-700 hover:text-indigo-900">Manage billing</Link></CardContent>
        </Card>
      </div>

      <Card className="mt-6"><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Only safe tenant activity will appear here when tenant-keyed logging is available.</CardDescription></CardHeader><CardContent>{summary.activity_available && summary.activity.length ? <div className="space-y-3">{summary.activity.map((item) => <div key={item.id} className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-800">{item.action}</p><p className="text-xs text-slate-500">{item.description}</p></div><time className="text-xs text-slate-400">{formatDate(item.created_at)}</time></div>)}</div> : <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500"><ShieldCheck className="h-5 w-5 text-slate-400" aria-hidden="true" /> No recent activity yet.</div>}</CardContent></Card>
    </>
  );
}

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-semibold text-indigo-700 hover:underline">{value}</a> : <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>}</div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><p className="text-xl font-bold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p></div>;
}
