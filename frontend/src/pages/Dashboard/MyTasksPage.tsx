import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, ListChecks, Search, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { taskService } from '../../services/task.service';
import type { Task, TaskPriority, TaskStatus } from '../../types/project.types';
import { showDashboardError, showDashboardSuccess } from '../../utils/dashboardAlert';
import { cn } from '../../utils/cn';

const statuses: Array<TaskStatus | ''> = ['', 'todo', 'in_progress', 'done'];
const priorities: Array<TaskPriority | ''> = ['', 'low', 'medium', 'high', 'urgent'];

const statusMeta: Record<TaskStatus, { label: string; tone: string; icon: typeof Clock3 }> = {
  todo: { label: 'To do', tone: 'dashboard-status-badge dashboard-status-badge--todo', icon: ListChecks },
  in_progress: { label: 'In progress', tone: 'dashboard-status-badge dashboard-status-badge--in-progress', icon: Clock3 },
  done: { label: 'Done', tone: 'dashboard-status-badge dashboard-status-badge--done', icon: CheckCircle2 },
};

const priorityClasses: Record<TaskPriority, string> = { low: 'task-priority-badge task-priority-badge--low', medium: 'task-priority-badge task-priority-badge--medium', high: 'task-priority-badge task-priority-badge--high', urgent: 'task-priority-badge task-priority-badge--urgent' };
const prioritySelectClasses: Record<TaskPriority, string> = { low: 'task-priority-select task-priority-select--low', medium: 'task-priority-select task-priority-select--medium', high: 'task-priority-select task-priority-select--high', urgent: 'task-priority-select task-priority-select--urgent' };
const statusClasses: Record<TaskStatus, string> = { todo: 'task-status-select task-status-select--todo', in_progress: 'task-status-select task-status-select--in_progress', done: 'task-status-select task-status-select--done' };
const priorityClass = (priority: TaskPriority) => priorityClasses[String(priority).toLowerCase() as TaskPriority] ?? priorityClasses.medium;
const prioritySelectClass = (priority: TaskPriority) => prioritySelectClasses[String(priority).toLowerCase() as TaskPriority] ?? prioritySelectClasses.medium;
const statusClass = (status: TaskStatus) => statusClasses[status];

function initials(name?: string | null) {
  return (name || 'Unassigned').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

export default function MyTasksPage() {
  const { activeTenant } = useTenant();
  const isMember = String(activeTenant?.role ?? '').toLowerCase() === 'member';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    try {
      const response = await taskService.list({ mine: isMember ? true : undefined, status: status || undefined, priority: priority || undefined, search: search || undefined, per_page: 50 });
      setTasks(response.data.data);
    } catch {
      setError(isMember ? 'Unable to load your tasks.' : 'Unable to load workspace tasks.');
    } finally {
      setLoading(false);
    }
  }, [activeTenant, isMember, priority, search, status]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const updateStatus = async (task: Task, nextStatus: TaskStatus) => {
    try {
      await taskService.update(task.id, { status: nextStatus });
      await load();
      void showDashboardSuccess('Task status updated');
    } catch {
      void showDashboardError('Task status was not updated', 'You may not have permission to update this task.');
    }
  };

  const counts = useMemo(() => ({
    open: tasks.filter((task) => task.status !== 'done').length,
    active: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  }), [tasks]);

  const title = isMember ? 'My tasks' : 'Workspace tasks';
  const description = isMember ? 'A focused view of work assigned to you.' : 'A live command view of every task in this workspace.';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title={title} description={description} action={<Button variant="secondary" onClick={() => void load()}>Refresh</Button>} />

      <section className="relative overflow-hidden rounded-[1.25rem] bg-slate-950 px-6 py-7 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300"><Sparkles size={14} aria-hidden="true" /> {isMember ? 'Your work queue' : 'Operations view'}</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Keep the next important thing moving.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Statuses and assignments stay tied to the active workspace, so the list reflects the latest server state.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[['Open', counts.open], ['Active', counts.active], ['Done', counts.done]].map(([label, value]) => (
              <div key={label} className="min-w-[5.4rem] border-l border-white/15 pl-3 sm:min-w-24 sm:pl-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><CircleAlert className="h-4 w-4" aria-hidden="true" />{error}</div> : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label className="relative block"><span className="sr-only">Search tasks</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isMember ? 'Find one of your tasks' : 'Search workspace tasks'} className="dashboard-control dashboard-control--icon h-12 rounded-xl bg-white pl-11" /></label>
        <select aria-label="Filter tasks by status" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | '')} className={cn('dashboard-control h-12 rounded-xl bg-white', status ? statusClass(status) : '')}>{statuses.map((item) => <option key={item} value={item}>{item ? statusMeta[item].label : 'All statuses'}</option>)}</select>
        <select aria-label="Filter tasks by priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | '')} className={cn('dashboard-control h-12 rounded-xl bg-white', priority ? prioritySelectClass(priority) : '')}>{priorities.map((item) => <option key={item} value={item}>{item ? `${item[0].toUpperCase()}${item.slice(1)} priority` : 'All priorities'}</option>)}</select>
      </div>

      <Card className="overflow-hidden border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{isMember ? 'Assigned to you' : 'All workspace tasks'}</h2><p className="mt-1 text-sm text-slate-500">{loading ? 'Synchronizing the latest work state' : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} in this view`}</p></div><ArrowUpRight className="h-5 w-5 text-indigo-500" aria-hidden="true" /></div><CardContent className="p-0">{loading ? <ProfessionalLoader variant="table" label="Loading tasks" detail="Syncing workspace task status" columns={4} /> : tasks.length === 0 ? <div className="px-6 py-14"><EmptyState icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />} title={search || status || priority ? 'No matching tasks' : isMember ? 'You have no assigned tasks' : 'No workspace tasks yet'} description={search || status || priority ? 'Try another filter or search term.' : isMember ? 'Tasks assigned to you will appear here.' : 'Create a task from a project to start tracking work.'} /></div> : <div>{tasks.map((task) => { return <article key={task.id} className="group grid gap-4 border-b border-slate-100 px-5 py-5 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7"><div className="flex min-w-0 gap-4"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">{initials(task.assignees[0]?.name)}</div><div className="min-w-0"><h3 className="truncate font-semibold text-slate-950">{task.title}</h3><p className="mt-1 truncate text-sm text-slate-500"><Link className="font-medium text-indigo-700 hover:text-indigo-500" to={`/dashboard/projects/${task.project_id}`}>{task.project_name || 'Project'}</Link><span className="mx-2 text-slate-300">·</span>{task.assignees.length ? task.assignees.map((person) => person.name).join(', ') : 'Unassigned'}{task.due_date ? <><span className="mx-2 text-slate-300">·</span>Due {task.due_date}</> : null}</p></div></div><div className="task-controls flex items-center justify-between gap-3 sm:justify-end"><span className={priorityClass(task.priority)}>{task.priority}</span><select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => void updateStatus(task, event.target.value as TaskStatus)} className={cn('dashboard-control task-status-select h-10 min-w-32 rounded-lg px-3 text-xs', statusClass(task.status))}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div></article>; })}</div>}</CardContent></Card>
    </div>
  );
}
