import { ArrowRight, CalendarDays, FolderKanban, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import { useTenant } from '../../hooks/useTenant';
import { projectService } from '../../services/project.service';
import type { Project, ProjectStatus } from '../../types/project.types';
import { projectApiError } from '../../utils/apiError';
import { showDashboardError, showDashboardSuccess } from '../../utils/dashboardAlert';

const statuses: Array<ProjectStatus | ''> = ['', 'active', 'completed', 'archived'];
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'No due date';

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
    let active = true;
    if (!activeTenant) { queueMicrotask(() => { if (active) { setProjects([]); setLoading(false); } }); return () => { active = false; }; }
    queueMicrotask(() => { if (active) { setLoading(true); setError(''); } });
    void projectService.list({ search: search || undefined, status: status || undefined }).then((response) => { if (active) setProjects(response.data.data); }).catch(() => { if (active) setError('Unable to load projects. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
      void showDashboardSuccess('Project created', `${response.data.data.name} is ready for planning.`);
    } catch (exception: unknown) {
      const message = projectApiError(exception) ?? 'Unable to create project. Check the project details and try again.';
      setError(message);
      void showDashboardError('Project was not created', message);
    } finally { setSaving(false); }
  };

  return <div className="pm-page">
    <header className="pm-page-header">
      <div><p className="pm-eyebrow">Workspace</p><h1>My Projects</h1><p>Plan the work, keep the next step visible, and follow progress without the dashboard clutter.</p></div>
      {canCreateProject ? <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setModalOpen(true)}>New project</Button> : null}
    </header>
    {!canCreateProject && activeTenant ? <p className="pm-permission-note">You have view access to projects. An owner or administrator can create new projects.</p> : null}
    <div className="pm-list-toolbar">
      <label className="pm-search"><span className="sr-only">Search projects</span><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" className="dashboard-control" /></label>
      <label className="pm-select-label"><span>Status</span><select aria-label="Filter projects by status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | '')} className="dashboard-control">{statuses.map((item) => <option key={item} value={item}>{item ? `${item[0].toUpperCase()}${item.slice(1)}` : 'All statuses'}</option>)}</select></label>
    </div>
    {error ? <div role="alert" className="pm-form-error pm-form-error--page">{error}</div> : null}
    {loading ? <ProfessionalLoader variant="table" label="Loading projects" detail="Syncing workspace projects" columns={4} /> : projects.length === 0 ? <Card><CardContent><EmptyState icon={<FolderKanban className="h-6 w-6" aria-hidden="true" />} title={search || status ? 'No matching projects' : 'No projects yet'} description={search || status ? 'Try a different search term or status.' : 'Create your first project to start organizing your team’s work.'} action={!search && !status && canCreateProject ? <Button onClick={() => setModalOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Create project</Button> : undefined} /></CardContent></Card> : <section className="pm-project-list" aria-label="Projects">{projects.map((project) => <Link key={project.id} to={`/dashboard/projects/${project.id}`} className="pm-project-list__row"><div className="pm-project-list__summary"><div className="pm-project-list__titleline"><h2>{project.name}</h2><span className={`pm-project-status pm-project-status--${project.status}`}>{project.status}</span></div><p>{project.description || 'No description yet.'}</p></div><div className="pm-project-list__progress"><span><b>{project.tasks_completed}</b> / {project.tasks_total} tasks</span><div role="progressbar" aria-valuenow={project.progress_percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${project.progress_percent}%` }} /></div><small>{project.progress_percent}% complete</small></div><div className="pm-project-list__deadline"><CalendarDays aria-hidden="true" /><span>{formatDate(project.due_date)}</span></div><ArrowRight className="pm-project-list__arrow" aria-hidden="true" /></Link>)}</section>}
    {modalOpen && canCreateProject ? <div className="pm-overlay" role="presentation"><Card className="pm-project-create-modal"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>New project</CardTitle><p className="mt-1 text-sm text-slate-500">Create a focused space for {activeTenant?.name ?? 'this workspace'}.</p></div><button type="button" aria-label="Close new project dialog" onClick={() => setModalOpen(false)} className="pm-icon-button">×</button></div></CardHeader><CardContent><form className="pm-project-create-form" onSubmit={createProject}><label>Project name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="dashboard-control" /></label><label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="dashboard-control" /></label><div><label>Start date<input type="date" min={today()} value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="dashboard-control" /></label><label>Due date<input type="date" min={form.start_date || today()} value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="dashboard-control" /></label></div><p>Dates are optional; if set, the due date cannot come before the start date.</p><footer><Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Create project</Button></footer></form></CardContent></Card></div> : null}
  </div>;
}
