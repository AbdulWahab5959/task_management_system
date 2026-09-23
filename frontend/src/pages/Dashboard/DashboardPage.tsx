import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CircleAlert,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';
import TenantOnboarding from '../../components/dashboard/TenantOnboarding';
import PendingInvitationsOnboarding from '../../components/dashboard/PendingInvitationsOnboarding';
import EmptyState from '../../components/dashboard/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { getCurrentBilling, type CurrentBillingResponse } from '../../services/billing.service';
import { tenantDashboardService } from '../../services/tenant-dashboard.service';
import type {
  PaginatedTenantActivity,
  TenantDashboardSummary,
} from '../../types/tenant-dashboard.types';

const ACTIVITY_PAGE_SIZE = 8;
const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  'tenant.organization.created': 'Organization created',
  'tenant.organization.updated': 'Organization updated',
  'tenant.member.invited': 'Member invited',
  'tenant.member.removed': 'Member removed',
  'tenant.member.role_updated': 'Member role updated',
  'tenant.settings.updated': 'Organization settings updated',
  'project.created': 'Project created',
  'task.created': 'Task created',
};

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

function formatActivityAction(action: string) {
  const knownLabel = ACTIVITY_ACTION_LABELS[action];
  if (knownLabel) return knownLabel;

  return action
    .replace(/^tenant\./, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getInitialActivityPagination(): PaginatedTenantActivity {
  return {
    data: [],
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: ACTIVITY_PAGE_SIZE,
    to: null,
    total: 0,
  };
}

function DashboardSummarySkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading organization overview" aria-busy="true">
      <div className="space-y-3">
        <div className="item-skeleton h-3 w-32 rounded" />
        <div className="item-skeleton h-8 w-72 rounded" />
        <div className="item-skeleton h-4 w-96 max-w-full rounded" />
      </div>
      <div className="item-skeleton h-32 rounded-xl" />
      <span className="sr-only">Preparing your workspace dashboard</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeTenant, loading: tenantsLoading, pendingInvitations, pendingInvitationsLoading } = useTenant();
  const [billing, setBilling] = useState<CurrentBillingResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activityPagination, setActivityPagination] = useState<PaginatedTenantActivity>(getInitialActivityPagination);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
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

  useEffect(() => {
    queueMicrotask(() => {
      setActivityPage(1);
      setActivityPagination(getInitialActivityPagination());
      setActivityError('');
    });
  }, [activeTenant?.id]);

  useEffect(() => {
    let cancelled = false;
    const tenantId = activeTenant?.id;

    if (!tenantId) {
      queueMicrotask(() => {
        if (!cancelled) setActivityLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setActivityLoading(true);
        setActivityError('');
      }
    });

    void tenantDashboardService.getActivity({ page: activityPage, per_page: ACTIVITY_PAGE_SIZE })
      .then((nextActivity) => {
        if (!cancelled) setActivityPagination(nextActivity);
      })
      .catch(() => {
        if (!cancelled) setActivityError('Unable to load recent activity.');
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTenant?.id, activityPage, activityRefreshKey]);

  const reload = () => {
    if (!activeTenant) return;
    const version = ++requestVersion.current;
    setSummary(null);
    setError('');
    setLoading(true);
    setActivityRefreshKey((value) => value + 1);
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
      return <ProfessionalLoader label="Loading organizations" detail="Preparing your workspace list" />;
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
      return <ProfessionalLoader label="Checking your invitations" detail="Preparing your workspace" />;
    }

    if (pendingInvitations.length > 0) {
      return <PendingInvitationsOnboarding invitations={pendingInvitations} />;
    }

    if (billingLoading) {
      return <ProfessionalLoader label="Checking your workspace plan" detail="Confirming your account access" />;
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
    return <DashboardSummarySkeleton />;
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
  const subscription = summary.billing.current_subscription;
  const hasActivity = activityPagination.data.length > 0;
  const isSuperAdmin = user?.role === 'super_admin';
  const organizationLimit = summary.billing.organization_limit === 'unlimited' ? null : Number(summary.billing.organization_limit);
  const isOverOrganizationLimit = organizationLimit !== null && summary.billing.organizations_used > organizationLimit;
  const organizationsOverLimit = isOverOrganizationLimit ? summary.billing.organizations_used - (organizationLimit ?? 0) : 0;

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

      {isSuperAdmin ? <div role="status" className="mt-5 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Platform administration mode</p><p className="mt-0.5 text-indigo-800">You are viewing this organization with platform-wide access. Customer plan limits and organization creation rules do not apply to your super-admin account.</p></div><Link to="/dashboard/organizations" className="shrink-0 font-semibold text-indigo-700 underline underline-offset-2">Manage organizations</Link></div> : isOverOrganizationLimit ? <div role="alert" className="mt-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Your account is over the current organization limit.</p><p className="mt-0.5">You have {summary.billing.organizations_used} active organizations, but your {subscription?.plan_name ?? 'current'} plan allows {organizationLimit}. New organizations are blocked until you upgrade or archive {organizationsOverLimit} organization{organizationsOverLimit === 1 ? '' : 's'}.</p></div><Link to="/dashboard/billing" className="shrink-0 font-semibold text-amber-800 underline underline-offset-2">Review plan</Link></div> : null}

      <Card className="mt-6 border-emerald-100 bg-emerald-50/40">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Organization overview lives in Organizations</CardTitle>
            <CardDescription className="mt-1">Manage your profile, team, subscription, projects, and tasks from one focused workspace view.</CardDescription>
          </div>
          <Link to="/dashboard/organizations" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#b8d85d] bg-[#d7f36b] px-4 py-2.5 text-sm font-semibold text-[#0b0d0c] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.4),0_0.35rem_0.9rem_rgb(95_126_26_/_0.14)] hover:bg-[#efffa8]">
            Open Organizations
          </Link>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Recent actions from people in this organization.</CardDescription>
        </CardHeader>
        <CardContent className="p-0" aria-busy={activityLoading}>
          {activityLoading && !hasActivity ? (
            <div className="space-y-3 px-5 py-5 sm:px-6" role="status" aria-label="Loading recent activity">
              <span className="sr-only">Loading recent activity</span>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="item-skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : activityError && !hasActivity ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6" role="alert">
              <CircleAlert className="h-8 w-8 text-amber-500" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Could not load recent activity</p>
              <p className="mt-1 text-sm text-slate-500">{activityError}</p>
              <button
                type="button"
                onClick={() => setActivityRefreshKey((value) => value + 1)}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
              </button>
            </div>
          ) : hasActivity ? (
            <>
              <ul className="divide-y divide-slate-100" role="list">
                {activityPagination.data.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{formatActivityAction(item.action)}</p>
                        <span className="rounded-full bg-[#f7fde7] px-2 py-0.5 text-xs font-semibold text-[#557014]">
                          {item.user?.name ?? 'System'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-500">{item.description ?? 'Activity recorded.'}</p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400 sm:pt-0.5">{formatDate(item.created_at)}</time>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs tabular-nums text-slate-500">
                  Showing {activityPagination.from ?? 0}–{activityPagination.to ?? 0} of {activityPagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActivityPage((page) => Math.max(1, page - 1))}
                    disabled={activityPage <= 1 || activityLoading}
                    aria-label="Previous activity page"
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-24 text-center text-xs font-semibold tabular-nums text-slate-600" aria-live="polite">
                    Page {activityPagination.current_page} of {activityPagination.last_page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivityPage((page) => Math.min(activityPagination.last_page, page + 1))}
                    disabled={activityPage >= activityPagination.last_page || activityLoading}
                    aria-label="Next activity page"
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {activityError ? <p className="border-t border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-900 sm:px-6" role="alert">{activityError}</p> : null}
            </>
          ) : (
            <div className="px-5 py-8 sm:px-6">
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
                eyebrow="Workspace timeline"
                title="No activity yet"
                description="Actions from people in this organization will appear here as work begins."
                action={<Link to="/dashboard/team" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Go to team</Link>}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
