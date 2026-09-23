import { AlertTriangle, Building2, CheckCircle2, CircleAlert, CreditCard, MailPlus, Pencil, Plus, Save, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../common/Card';
import Input from '../common/Input';
import StatsCard from './StatsCard';
import SetupChecklist from './SetupChecklist';
import TenantCreationForm from './TenantCreationForm';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { tenantSettingsService } from '../../services/tenant-settings.service';
import { tenantService } from '../../services/tenant.service';
import { tenantDashboardService } from '../../services/tenant-dashboard.service';
import type { TenantSettings } from '../../types/tenant-settings.types';
import type { TenantDashboardSummary } from '../../types/tenant-dashboard.types';
import { getBillingPlans, getCurrentBilling, type BillingPlan, type CurrentBillingResponse } from '../../services/billing.service';
import { showDashboardToast } from '../../utils/dashboardAlert';

type OrganizationForm = {
  [Field in Exclude<keyof TenantSettings, 'tenant_id'>]: NonNullable<TenantSettings[Field]>;
};

const industries = [
  ['healthcare', 'Healthcare'], ['logistics', 'Logistics'], ['ecommerce', 'E-commerce'],
  ['real-estate', 'Real estate'], ['education', 'Education'], ['hospitality', 'Hospitality'],
  ['professional-services', 'Professional services'], ['other', 'Other'],
];
const timezones = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];

function blankOrganization(name = ''): OrganizationForm {
  return { name, website: '', industry: '', description: '', contact_email: '', phone: '', country: '', timezone: 'UTC', currency: 'USD' };
}

function organizationFormFromSettings(settings: Partial<TenantSettings>, fallbackName = ''): OrganizationForm {
  return { name: settings.name ?? fallbackName, website: settings.website ?? '', industry: settings.industry ?? '', description: settings.description ?? '', contact_email: settings.contact_email ?? '', phone: settings.phone ?? '', country: settings.country ?? '', timezone: settings.timezone ?? 'UTC', currency: settings.currency ?? 'USD' };
}

const tenantSummaryRequests = new Map<number, Promise<TenantDashboardSummary>>();
let billingRequest: Promise<CurrentBillingResponse> | null = null;

function requestTenantSummary(tenantId: number) {
  const existing = tenantSummaryRequests.get(tenantId);
  if (existing) return existing;

  const request = tenantDashboardService.getSummary();
  tenantSummaryRequests.set(tenantId, request);
  void request.then(
    () => { if (tenantSummaryRequests.get(tenantId) === request) tenantSummaryRequests.delete(tenantId); },
    () => { if (tenantSummaryRequests.get(tenantId) === request) tenantSummaryRequests.delete(tenantId); },
  );
  return request;
}

function requestCurrentBilling() {
  if (billingRequest) return billingRequest;
  billingRequest = getCurrentBilling();
  void billingRequest.then(
    () => { billingRequest = null; },
    () => { billingRequest = null; },
  );
  return billingRequest;
}

function formatIndustry(industry?: string | null) {
  return industry ? industry.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not configured';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function OrganizationDetail({ label, value, href }: { label: string; value: string; href?: string }) {
  return <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-1 block break-words text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900 hover:underline">{value}</a> : <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>}</div>;
}

export default function OrganizationManagementPanel() {
  const navigate = useNavigate();
  const { activeTenant, tenants, selectTenant, refreshTenants } = useTenant();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [form, setForm] = useState<OrganizationForm>(blankOrganization(activeTenant?.name));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [billing, setBilling] = useState<CurrentBillingResponse | null>(null);
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [upgradePlans, setUpgradePlans] = useState<BillingPlan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const activeTenantId = activeTenant?.id;
  const activeTenantName = activeTenant?.name ?? '';
  const modalOpen = createOpen || editOpen || limitOpen || deleteOpen;

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const dismissOnBackdrop = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('[role="dialog"]')) return;
      setCreateOpen(false);
      setEditOpen(false);
      setLimitOpen(false);
      setDeleteOpen(false);
    };
    document.addEventListener('mousedown', dismissOnBackdrop);
    return () => document.removeEventListener('mousedown', dismissOnBackdrop);
  }, [modalOpen]);

  useEffect(() => {
    if (!message) return;
    void showDashboardToast('success', message);
  }, [message]);

  useEffect(() => {
    if (!error) return;
    void showDashboardToast('error', error);
  }, [error]);

  useEffect(() => {
    let mounted = true;
    void requestCurrentBilling().then((currentBilling) => {
      if (!mounted) return;
      setBilling(currentBilling);
    }).catch(() => {
      // The server remains the final authority if billing is temporarily unavailable.
    });
    return () => { mounted = false; };
  }, []);

  const canCreateOrganization = !isSuperAdmin && (billing?.organization_limit === 'unlimited'
    || (billing !== null && Number(billing.organizations_used) < Number(billing.organization_limit)));

  const loadUpgradePlans = () => {
    if (plansLoaded || plansLoading) return;
    setPlansLoading(true);
    void getBillingPlans().then((plansResponse) => {
      setUpgradePlans(plansResponse.data ?? []);
    }).catch(() => {
      setUpgradePlans([]);
    }).finally(() => {
      setPlansLoaded(true);
      setPlansLoading(false);
    });
  };

  const openCreateOrganization = () => {
    if (billing && !canCreateOrganization) {
      setLimitOpen(true);
      loadUpgradePlans();
      return;
    }
    setCreateOpen(true);
  };

  useEffect(() => {
    if (!activeTenantId) return;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setSummaryLoading(true);
      setSummary(null);
      setForm(blankOrganization());
      setMessage('');
    });
    void requestTenantSummary(activeTenantId)
      .then((nextSummary) => {
        if (!mounted) return;
        setSummary(nextSummary);
        setForm(organizationFormFromSettings({
          name: nextSummary.tenant.name,
          ...nextSummary.organization_profile,
        }, nextSummary.tenant.name));
      })
      .catch(() => { if (mounted) setSummary(null); })
      .finally(() => { if (mounted) setSummaryLoading(false); });
    return () => { mounted = false; };
  }, [activeTenantId]);

  const openEditOrganization = () => {
    setEditOpen(true);
    if (summary || loading) return;
    setLoading(true);
    setError('');
    void tenantSettingsService.get()
      .then((response) => {
        setForm(organizationFormFromSettings(response.data.data, activeTenantName));
      })
      .catch(() => {
        setError('This organization profile database is not provisioned yet. You can still manage the organization record from the list.');
      })
      .finally(() => setLoading(false));
  };

  const update = (field: keyof OrganizationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTenant) return;
    setSaving(true); setMessage(''); setError('');
    try {
      const response = await tenantSettingsService.update(form);
      const settings = response.data.data;
      setForm(organizationFormFromSettings(settings, activeTenant.name));
      await refreshTenants();
      setEditOpen(false);
      void requestTenantSummary(activeTenant.id).then(setSummary).catch(() => undefined);
      setMessage('Organization details saved.');
    } catch (exception) {
      const response = (exception as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Unable to save organization details.');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!activeTenant || deleting) return;
    setDeleting(true); setError('');
    try {
      await tenantService.destroy(activeTenant.id);
      await refreshTenants();
      setDeleteOpen(false);
      setMessage('Organization removed.');
    } catch (exception) {
      const response = (exception as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Unable to remove this organization.');
    } finally { setDeleting(false); }
  };

  const setPrimary = async () => {
    if (!activeTenant || settingPrimary || activeTenant.is_primary) return;
    setSettingPrimary(true); setError('');
    try {
      await tenantService.setPrimary(activeTenant.id);
      await refreshTenants();
      setMessage('Primary organization updated.');
    } catch {
      setError('Unable to select the primary organization.');
    } finally { setSettingPrimary(false); }
  };

  if (!activeTenant) return null;
  const profile = summary?.organization_profile;
  const subscription = summary?.billing.current_subscription;
  const eligibleUpgradePlans = upgradePlans.filter((plan) => plan.limits?.organizations === 'unlimited' || Number(plan.limits?.organizations) > Number(billing?.organization_limit));
  const statsCardClass = '!bg-emerald-50 !border-emerald-100';

  return (
    <Card className="organization-management-panel mb-6 overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <CardHeader className="bg-slate-50/45 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
            <div><CardTitle className="tracking-tight">Organization management</CardTitle><CardDescription>Create, view, select, and edit the workspaces you manage.</CardDescription></div>
          </div>
          {!isSuperAdmin ? <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" className="w-full shrink-0 !bg-emerald-500 shadow-emerald-200/70 hover:!bg-emerald-600 focus-visible:!ring-emerald-500 sm:w-auto" onClick={openCreateOrganization} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Create organization</Button>
          </div> : <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">Platform-wide access</span>}
        </div>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:px-7 sm:py-6">
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-3">
          <div className="mb-2 flex items-center justify-between gap-3 px-2 sm:px-1">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Your workspaces</p><p className="mt-1 text-xs text-slate-500">Select a workspace to review its current health.</p></div>
            <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-500 ring-1 ring-slate-200/80">{tenants.length} {tenants.length === 1 ? 'workspace' : 'workspaces'}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => (
            <button type="button" key={tenant.id} onClick={() => selectTenant(tenant.id)} className={`flex min-h-16 items-center justify-between rounded-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 ${tenant.id === activeTenant.id ? 'border-emerald-300 bg-emerald-50/80 shadow-sm shadow-emerald-100 ring-1 ring-emerald-200' : 'border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/50 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-emerald-100/60'}`}>
              <span><span className="block text-sm font-semibold text-slate-900">{tenant.name}</span><span className="block text-xs text-slate-500">{tenant.slug} · {tenant.role ?? 'member'}</span></span>
              {tenant.id === activeTenant.id ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Selected organization" /> : null}
            </button>
          ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/35 sm:px-5">
          <div><p className="text-sm font-semibold text-slate-900">Selected organization</p><p className="mt-1 text-xs text-slate-500">Review the workspace overview below or edit its profile details.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50" onClick={openEditOrganization} disabled={loading || summaryLoading} icon={<Pencil className="h-4 w-4" aria-hidden="true" />}>Edit organization</Button>
            {activeTenant.role === 'owner' && !activeTenant.is_primary ? <Button type="button" variant="secondary" onClick={() => void setPrimary()} disabled={settingPrimary}>Make primary</Button> : null}
            {(activeTenant.role === 'owner' || isSuperAdmin) ? <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>Archive organization</Button> : null}
          </div>
        </div>
        {summaryLoading ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading organization overview" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <div key={index} className="item-skeleton h-28 rounded-xl" />)}</div> : summary && profile ? <>
          <div className="stats-grid mt-6 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Profile completion" value={`${profile.completion_percent}%`} description={`${profile.missing_fields.length} fields remaining`} icon={<Building2 />} variant="emerald" compact className={statsCardClass} />
            <StatsCard title="Active team" value={String(summary.team.members_total)} description={`${summary.team.admins} admins, ${summary.team.members} members`} icon={<Users />} variant="emerald" compact className={statsCardClass} />
            <StatsCard title="Subscription" value={subscription?.plan_name ?? 'Not available'} description={subscription ? `${subscription.status} · ${summary.billing.subscription_scope}-scoped` : 'Billing unavailable'} icon={<CreditCard />} variant="emerald" compact className={statsCardClass} />
            <StatsCard title="Open tasks" value={String(summary.projects.tasks_total - summary.projects.tasks_completed)} description={`${summary.projects.tasks_completed} completed`} icon={<Users />} variant="emerald" compact className={statsCardClass} />
          </div>
          <div className="stats-grid mt-4 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Projects" value={String(summary.projects.total)} description={`${summary.projects.active} active projects`} icon={<Building2 />} variant="emerald" compact className={statsCardClass} />
            <StatsCard title="Completed projects" value={String(summary.projects.completed)} description="Projects finished" icon={<ShieldCheck />} variant="emerald" compact className={statsCardClass} />
            <StatsCard title="Overdue tasks" value={String(summary.projects.tasks_overdue)} description="Needs attention" icon={<CircleAlert />} variant="emerald" compact className={statsCardClass} />
            <StatsCard title="Pending invitations" value={String(summary.team.pending_invitations)} description={summary.team.pending_invitations ? 'Ready for review' : 'No invitations waiting'} icon={<MailPlus />} variant="emerald" compact className={statsCardClass} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <Card className="border-slate-200/80 shadow-sm shadow-slate-200/45">
              <CardHeader className="bg-slate-50/35"><CardTitle>Organization profile</CardTitle><CardDescription>Full profile details for {activeTenant.name}.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <OrganizationDetail label="Industry" value={formatIndustry(profile.industry)} />
                  <OrganizationDetail label="Website" value={profile.website || 'Not configured'} href={profile.website || undefined} />
                  <OrganizationDetail label="Description" value={profile.description || 'Not configured'} />
                  <OrganizationDetail label="Contact email" value={profile.contact_email || 'Not configured'} />
                  <OrganizationDetail label="Phone" value={profile.phone || 'Not configured'} />
                  <OrganizationDetail label="Country" value={profile.country || 'Not configured'} />
                  <OrganizationDetail label="Timezone" value={profile.timezone} />
                  <OrganizationDetail label="Currency" value={profile.currency} />
                  <OrganizationDetail label="Created" value={formatDate(summary.tenant.created_at)} />
                </div>
                <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"><div><p className="text-sm font-semibold text-emerald-950">{profile.completion_percent}% complete</p><p className="mt-0.5 text-xs text-emerald-700">{profile.missing_fields.length ? `Add ${profile.missing_fields.join(', ')} to finish the profile.` : 'The organization profile is complete.'}</p></div><Button type="button" variant="secondary" onClick={openEditOrganization}>Edit details</Button></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 shadow-sm shadow-slate-200/45">
              <CardHeader className="bg-slate-50/35"><CardTitle>Setup checklist</CardTitle><CardDescription>Recommended steps for this organization.</CardDescription></CardHeader>
              <CardContent><SetupChecklist items={summary.setup_checklist} /></CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200/80 shadow-sm shadow-slate-200/45">
              <CardHeader className="bg-slate-50/35"><CardTitle>Team overview</CardTitle><CardDescription>Active members and pending invitations.</CardDescription></CardHeader>
              <CardContent><div className="grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><p className="text-xl font-bold tabular-nums text-slate-950">{summary.team.owners}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Owners</p></div><div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><p className="text-xl font-bold tabular-nums text-slate-950">{summary.team.admins}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Admins</p></div><div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><p className="text-xl font-bold tabular-nums text-slate-950">{summary.team.members}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p></div></div><p className="mt-4 text-sm text-slate-600">{summary.team.members_total <= 1 ? 'Invite your first team member.' : `${summary.team.members_total} active members in this organization.`}</p><Link to="/dashboard/team" className="mt-4 inline-flex items-center justify-center text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900">Manage team</Link></CardContent>
            </Card>
            <Card className="border-slate-200/80 shadow-sm shadow-slate-200/45">
              <CardHeader className="bg-slate-50/35"><CardTitle>Your current subscription</CardTitle><CardDescription>Your plan and payment cover this organization.</CardDescription></CardHeader>
              <CardContent>{subscription ? <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Plan</span><span className="text-sm font-semibold text-slate-900">{subscription.plan_name ?? 'Unnamed plan'}</span></div><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Organizations</span><span className="text-sm font-semibold text-slate-900">{summary.billing.organizations_used} of {summary.billing.organization_limit}</span></div><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Status</span><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">{subscription.status}</span></div>{subscription.current_period_end ? <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Current period ends</span><span className="text-sm font-semibold text-slate-900">{formatDate(subscription.current_period_end)}</span></div> : null}<div className="border-t border-slate-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Included features</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{summary.billing.plan_features.map((feature) => <li key={feature}>• {feature}</li>)}</ul></div></div> : <p className="text-sm text-slate-500">Billing information is not available yet.</p>}<Link to="/dashboard/billing" className="mt-5 inline-flex items-center justify-center text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900">Manage billing</Link></CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200/80 shadow-sm shadow-slate-200/45">
              <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Open tasks</CardTitle><CardDescription>Work assigned in this organization.</CardDescription></div><Link to="/dashboard/tasks" className="text-sm font-semibold text-amber-700 transition-colors hover:text-amber-900">View all</Link></div></CardHeader>
              <CardContent>{summary.projects.my_tasks.length ? <div className="divide-y divide-slate-100">{summary.projects.my_tasks.slice(0, 4).map((task) => <div key={task.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.project_name || 'Project'}{task.due_date ? ` · Due ${task.due_date}` : ''}</p></div><span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-600">{task.priority}</span></div>)}</div> : <p className="text-sm text-slate-500">No open tasks assigned.</p>}</CardContent>
            </Card>
            <Card className="border-slate-200/80 shadow-sm shadow-slate-200/45">
              <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Recent projects</CardTitle><CardDescription>Latest work in this organization.</CardDescription></div><Link to="/dashboard/projects" className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900">View all</Link></div></CardHeader>
              <CardContent>{summary.projects.recent_projects.length ? <div className="divide-y divide-slate-100">{summary.projects.recent_projects.slice(0, 4).map((project) => <Link key={project.id} to={`/dashboard/projects/${project.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-emerald-700"><span className="truncate text-sm font-semibold text-slate-800">{project.name}</span><span className="shrink-0 text-xs font-semibold capitalize text-slate-500">{project.status}</span></Link>)}</div> : <p className="text-sm text-slate-500">No projects yet.</p>}</CardContent>
            </Card>
          </div>

        </> : <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4" role="alert"><p className="text-sm font-semibold text-amber-950">Organization overview is unavailable right now.</p><p className="mt-1 text-sm text-amber-800">The organization list and profile editor are still available. Refresh the page to try loading the overview again.</p></div>}
      </CardContent>
      {createOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-5 py-5 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="create-organization-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">New workspace</p><h2 id="create-organization-title" className="mt-1 text-xl font-semibold text-slate-950">Create an organization</h2><p className="mt-2 text-sm text-slate-500">These details are required to configure your organization workspace.</p></div><button type="button" aria-label="Close create organization dialog" onClick={() => setCreateOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="mt-5"><TenantCreationForm onCreated={() => { setCreateOpen(false); setMessage('Organization created and selected.'); }} /></div></div></div> : null}
      {editOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 px-5 py-5 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="edit-organization-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Workspace profile</p><h2 id="edit-organization-title" className="mt-1 text-xl font-semibold text-slate-950">Edit organization</h2><p className="mt-2 text-sm text-slate-500">Update the profile details used across your LaunchStack workspace.</p></div><button type="button" aria-label="Close edit organization dialog" onClick={() => setEditOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2"><Input label="Organization name" value={form.name} onChange={(event) => update('name', event.target.value)} required /><label className="block text-sm font-medium text-slate-700">Industry<select value={form.industry} onChange={(event) => update('industry', event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="">Select an industry</option>{industries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Input label="Website URL" type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://example.com" /><Input label="Contact email" type="email" value={form.contact_email} onChange={(event) => update('contact_email', event.target.value)} placeholder="hello@example.com" /><label className="block text-sm font-medium text-slate-700 md:col-span-2">Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={4} placeholder="What will this workspace be used for?" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label><Input label="Phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} /><Input label="Country" value={form.country} onChange={(event) => update('country', event.target.value)} /><label className="block text-sm font-medium text-slate-700">Timezone<select value={form.timezone} onChange={(event) => update('timezone', event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">{timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></label><Input label="Currency" value={form.currency} onChange={(event) => update('currency', event.target.value)} placeholder="USD" /><div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 md:col-span-2"><Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" aria-hidden="true" />}>Save organization</Button></div></form></div></div> : null}
      {limitOpen ? <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden bg-slate-950/50 px-4 py-5 backdrop-blur-sm sm:px-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLimitOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="organization-create-limit-title" className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl"><div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Plan limit reached</p><h2 id="organization-create-limit-title" className="mt-1 text-xl font-semibold text-slate-950">You cannot create another organization</h2><p className="mt-2 max-w-xl text-sm leading-5 text-slate-500">Upgrade your plan to create another organization.</p></div></div><button type="button" aria-label="Close organization limit dialog" onClick={() => setLimitOpen(false)} className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color] duration-150 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6"><p className="text-sm leading-6 text-slate-600">Your current plan allows <strong>{billing?.organization_limit}</strong> organizations, and you already use <strong>{billing?.organizations_used}</strong>. Upgrade your plan to create another organization.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{eligibleUpgradePlans.map((plan) => <button key={plan.id} type="button" onClick={() => navigate(`/dashboard/billing/checkout/${plan.id}`)} className="inline-flex min-h-16 items-center justify-between gap-5 rounded-lg bg-emerald-500 px-4 py-2.5 text-left text-white shadow-sm shadow-emerald-200/70 transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><span><span className="block text-sm font-semibold">Upgrade to {plan.name}</span><span className="mt-0.5 block text-xs text-white/85">{plan.limits?.organizations === 'unlimited' ? 'Unlimited organizations' : 'Up to ' + plan.limits?.organizations + ' organizations'}</span></span></button>)}{eligibleUpgradePlans.length === 0 ? <button type="button" onClick={() => navigate('/dashboard/billing')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:col-span-2">Review available plans</button> : null}</div><div className="mt-6 flex justify-center border-t border-slate-100 pt-5"><button type="button" onClick={() => setLimitOpen(false)} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-500 px-7 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200/70 transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Close</button></div></div></div></div> : null}
      {deleteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-5 py-8 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="delete-organization-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Delete organization</p><h2 id="delete-organization-title" className="mt-1 text-xl font-semibold text-slate-950">Remove {activeTenant.name}?</h2></div><button type="button" aria-label="Close delete confirmation" onClick={() => setDeleteOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><p className="mt-4 text-sm leading-6 text-slate-600">This removes the organization from your active workspace list. Its historical record is retained safely for audit purposes.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button type="button" variant="danger" isLoading={deleting} onClick={() => void remove()}>Confirm delete</Button></div></div></div> : null}
    </Card>
  );
}
