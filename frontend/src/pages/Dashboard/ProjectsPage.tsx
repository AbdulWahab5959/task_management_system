import { isAxiosError } from 'axios';
import { CalendarDays, FolderKanban, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { projectService } from '../../services/project.service';
import type { Project, ProjectStatus } from '../../types/project.types';
import { showDashboardError, showDashboardSuccess } from '../../utils/dashboardAlert';

const statuses: Array<ProjectStatus | ''> = ['', 'active', 'completed', 'archived'];
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'No deadline';

function apiError(error: unknown) {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    if (error.response?.status === 500) return 'This workspace database is missing the latest project update. An administrator must run the tenant migration command.';
    return Object.values(error.response?.data?.errors ?? {}).flat()[0] ?? error.response?.data?.message;
  }
  return undefined;
}

export default function ProjectsPage() {
  const { activeTenant } = useTenant();
  const canCreateProject = activeTenant?.role === 'owner' || activeTenant?.role === 'admin' || activeTenant?.permissions?.includes('projects.create');
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', due_date: '' });

  const loadProjects = useCallback(() => {
    let mounted = true;
    if (!activeTenant) { queueMicrotask(() => { if (mounted) { setProjects([]); setLoading(false); } }); return () => { mounted = false; }; }
    queueMicrotask(() => { if (mounted) { setLoading(true); setError(''); } });
    void projectService.list({ search: search || undefined, status: status || undefined }).then((response) => {
      if (mounted) setProjects(response.data.data);
    }).catch(() => { if (mounted) setError('Unable to load projects.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [activeTenant, search, status]);

  useEffect(() => loadProjects(), [loadProjects]);

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await projectService.create({ ...form, start_date: form.start_date || undefined, due_date: form.due_date || undefined });
      setProjects((current) => [response.data.data, ...current]);
      setForm({ name: '', description: '', start_date: '', due_date: '' });
      setModalOpen(false);
      void showDashboardSuccess('Project created', `${response.data.data.name} is ready in this workspace.`);
    } catch (exception: unknown) {
      const message = apiError(exception) ?? 'Unable to create project. Check the project details and try again.';
      setError(message);
      void showDashboardError('Project was not created', message);
    } finally { setSaving(false); }
  };

  return <>
    <PageHeader eyebrow="Workspace" title="Projects" description="Plan the work, track progress, and keep every project in one secure workspace." action={canCreateProject ? <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setModalOpen(true)}>New project</Button> : undefined} />
    {!canCreateProject && activeTenant ? <p className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">You have view access to projects. An owner or administrator can create new projects.</p> : null}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input aria-label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" className="dashboard-control dashboard-control--icon" /></div>
      <select aria-label="Filter projects by status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | '')} className="dashboard-control sm:w-44">{statuses.map((item) => <option key={item} value={item}>{item ? `${item[0].toUpperCase()}${item.slice(1)}` : 'All statuses'}</option>)}</select>
    </div>
    {error ? <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
    {loading ? <ProfessionalLoader variant="table" label="Loading projects" detail="Syncing workspace projects" columns={4} /> : projects.length === 0 ? <Card><CardContent><EmptyState icon={<FolderKanban className="h-6 w-6" aria-hidden="true" />} title={search || status ? 'No matching projects' : 'No projects yet'} description={search || status ? 'Try a different search or status filter.' : 'Create your first project to start organizing your team\'s work.'} action={!search && !status && canCreateProject ? <Button onClick={() => setModalOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Create project</Button> : undefined} /></CardContent></Card> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <Card key={project.id} className="flex flex-col"><CardHeader><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"><FolderKanban className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><CardTitle className="truncate">{project.name}</CardTitle><span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold capitalize text-slate-600">{project.status}</span></div></div></div></CardHeader><CardContent className="flex flex-1 flex-col"><p className="min-h-12 text-sm leading-6 text-slate-500">{project.description || 'No project description yet.'}</p><div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Progress</span><span>{project.progress_percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${project.progress_percent}%` }} /></div></div><div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(project.due_date)}</span><span>{project.tasks_completed}/{project.tasks_total} tasks</span></div><Link to={`/dashboard/projects/${project.id}`} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Open project</Link></CardContent></Card>)}</div>}
    {modalOpen && canCreateProject ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"><Card className="w-full max-w-lg"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>New project</CardTitle><p className="mt-1 text-sm text-slate-500">Create a project for {activeTenant?.name ?? 'this workspace'}.</p></div><button type="button" aria-label="Close new project dialog" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">×</button></div></CardHeader><CardContent><form className="space-y-4" onSubmit={createProject}><label className="block text-sm font-semibold text-slate-700">Project name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="dashboard-control mt-1" /></label><label className="block text-sm font-semibold text-slate-700">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="dashboard-control mt-1 py-3" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Start date<input type="date" min={today()} value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="dashboard-control mt-1" /></label><label className="block text-sm font-semibold text-slate-700">Due date<input type="date" min={form.start_date || today()} value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="dashboard-control mt-1" /></label></div><p className="text-xs text-slate-500">Project dates must be today or later, and the due date cannot be before the start date.</p><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Create project</Button></div></form></CardContent></Card></div> : null}
  </>;
}
