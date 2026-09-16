import { BarChart3, CheckCircle2, ClipboardList, FolderKanban, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/dashboard/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { tenantAnalyticsService } from '../../services/tenant-analytics.service';
import type { TenantDashboardSummary } from '../../types/tenant-dashboard.types';
import { showDashboardError } from '../../utils/dashboardAlert';

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Users }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><Icon className="h-4 w-4 text-indigo-500" aria-hidden="true" /></div><p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

export default function OrganizationAnalyticsPage() {
  const { activeTenant } = useTenant();
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setLoading(true);
      setError(false);
      setSummary(null);
    });
    void tenantAnalyticsService.get().then((response) => {
      if (mounted) setSummary(response.data.data);
    }).catch(() => {
      if (mounted) {
        setError(true);
        void showDashboardError('Analytics are unavailable', 'You may not have permission to view this organization analytics page.');
      }
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [activeTenant?.id]);

  if (!activeTenant) return null;
  if (loading) return <><PageHeader eyebrow="Workspace" title="Analytics" description="Loading organization activity." /><Card><CardContent className="flex min-h-64 items-center justify-center"><LoadingSpinner label="Loading organization analytics" /></CardContent></Card></>;
  if (error || !summary) return <><PageHeader eyebrow="Workspace" title="Analytics" description="Organization analytics overview." /><Card><CardContent className="py-16 text-center"><BarChart3 className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Analytics are unavailable</h2><p className="mt-2 text-sm text-slate-500">Ask an organization owner to grant View analytics access.</p></CardContent></Card></>;

  const { projects, team } = summary;
  return <><PageHeader eyebrow="Workspace" title="Analytics" description={`A focused view of ${activeTenant.name}'s projects, tasks, and team.`} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Team members" value={team.members_total} detail={`${team.admins} admins, ${team.members} members`} icon={Users} /><Metric label="Projects" value={projects.total} detail={`${projects.active} active, ${projects.completed} completed`} icon={FolderKanban} /><Metric label="Tasks" value={projects.tasks_total} detail={`${projects.tasks_completed} completed`} icon={ClipboardList} /><Metric label="Overdue tasks" value={projects.tasks_overdue} detail="Open tasks past their due date" icon={BarChart3} /></div><div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]"><Card><CardHeader><CardTitle>Project activity</CardTitle></CardHeader><CardContent><div className="space-y-3">{projects.recent_projects.length === 0 ? <p className="text-sm text-slate-500">No project activity yet.</p> : projects.recent_projects.map((project) => <div key={project.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{project.name}</p><p className="mt-1 text-xs text-slate-500">Due {project.due_date || 'not set'}</p></div><span className="dashboard-badge bg-slate-100 text-slate-600 ring-slate-200">{project.status}</span></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Task health</CardTitle></CardHeader><CardContent><div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4"><CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" /><div><p className="text-sm font-semibold text-emerald-950">{projects.tasks_completed} completed</p><p className="mt-1 text-xs text-emerald-800">{projects.tasks_overdue} overdue tasks need attention.</p></div></div></CardContent></Card></div></>;
}
