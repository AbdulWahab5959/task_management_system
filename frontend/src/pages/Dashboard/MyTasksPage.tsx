import { CheckCircle2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import TaskDetailModal from '../../components/projects/TaskDetailModal';
import TaskRow from '../../components/projects/TaskRow';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { taskService } from '../../services/task.service';
import { tenantMembersService } from '../../services/tenant-members.service';
import type { TenantMember } from '../../types/tenant-member.types';
import type { Task, TaskPriority } from '../../types/project.types';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
const filters: Array<{ value: TaskFilter; label: string }> = [{ value: 'all', label: 'All' }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'overdue', label: 'Overdue' }, { value: 'completed', label: 'Completed' }];
const priorities: Array<TaskPriority | ''> = ['', 'low', 'medium', 'high', 'urgent'];
const today = () => new Date().toISOString().slice(0, 10);

export default function MyTasksPage() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    if (!activeTenant) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const response = await taskService.list({ mine: true, priority: priority || undefined, search: search || undefined, per_page: 50 });
      setTasks(response.data.data);
    } catch { setError('Unable to load your tasks. Please try again.'); }
    finally { setLoading(false); }
  }, [activeTenant, priority, search]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  useEffect(() => {
    if (!activeTenant) return;
    void tenantMembersService.list().then((response) => setMembers(response.data.data)).catch(() => {
      if (user) setMembers([{ id: user.id, name: user.name, email: user.email, role: activeTenant.role === 'owner' ? 'owner' : activeTenant.role === 'admin' ? 'admin' : 'member', joined_at: null, effective_permissions: [], direct_permissions: [] }]);
    });
  }, [activeTenant, user]);

  const visible = useMemo(() => {
    const date = today();
    return tasks.filter((task) => {
      if (filter === 'completed') return task.status === 'done';
      if (filter === 'today') return task.status !== 'done' && task.due_date === date;
      if (filter === 'upcoming') return task.status !== 'done' && Boolean(task.due_date && task.due_date > date);
      if (filter === 'overdue') return task.status !== 'done' && Boolean(task.due_date && task.due_date < date);
      return true;
    });
  }, [filter, tasks]);

  const groups = useMemo(() => {
    const date = today();
    if (filter === 'today') return [{ title: 'Today', tasks: visible }];
    if (filter === 'upcoming') return [{ title: 'Upcoming', tasks: visible }];
    if (filter === 'overdue') return [{ title: 'Overdue', tasks: visible }];
    if (filter === 'completed') return [{ title: 'Completed', tasks: visible }];
    return [
      { title: 'Overdue', tasks: visible.filter((task) => task.status !== 'done' && Boolean(task.due_date && task.due_date < date)) },
      { title: 'Today', tasks: visible.filter((task) => task.status !== 'done' && task.due_date === date) },
      { title: 'Upcoming', tasks: visible.filter((task) => task.status !== 'done' && Boolean(task.due_date && task.due_date > date)) },
      { title: 'No due date', tasks: visible.filter((task) => task.status !== 'done' && !task.due_date) },
      { title: 'Completed', tasks: visible.filter((task) => task.status === 'done') },
    ].filter((group) => group.tasks.length > 0);
  }, [filter, visible]);

  const toggleTask = async (task: Task) => {
    try { await taskService.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); await load(); }
    catch { setError('We could not update that task. Please try again.'); }
  };

  return <div className="pm-page pm-my-tasks">
    <header className="pm-page-header"><div><p className="pm-eyebrow">My work</p><h1>My Tasks</h1><p>A focused view of the work assigned to you across this workspace.</p></div></header>
    <div className="pm-task-filters" role="group" aria-label="Task filters">{filters.map((item) => <button type="button" key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={filter === item.value ? 'is-active' : ''}>{item.label}</button>)}</div>
    <div className="pm-list-toolbar pm-list-toolbar--tasks"><label className="pm-search"><span className="sr-only">Search my tasks</span><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="dashboard-control" /></label><label className="pm-select-label"><span>Priority</span><select aria-label="Filter tasks by priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | '')} className="dashboard-control">{priorities.map((item) => <option key={item} value={item}>{item ? `${item[0].toUpperCase()}${item.slice(1)} priority` : 'All priorities'}</option>)}</select></label></div>
    {error ? <div role="alert" className="pm-form-error pm-form-error--page">{error}</div> : null}
    {loading ? <ProfessionalLoader variant="table" label="Loading your tasks" detail="Syncing the latest assigned work" columns={4} /> : visible.length === 0 ? <section className="pm-empty-workspace"><EmptyState icon={<CheckCircle2 aria-hidden="true" />} title={search || priority || filter !== 'all' ? 'No tasks match this filter' : 'You’re all caught up'} description={search || priority || filter !== 'all' ? 'Try another filter or search term.' : 'Tasks assigned to you will appear here.'} /></section> : <section className="pm-my-task-groups" aria-label="My tasks">{groups.map((group) => <section key={group.title} className="pm-my-task-group"><header><h2>{group.title}</h2><span>{group.tasks.length}</span></header><div>{group.tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={setSelectedTask} onToggle={(item) => void toggleTask(item)} showProject />)}</div></section>)}</section>}
    {selectedTask ? <TaskDetailModal task={selectedTask} project={{ id: selectedTask.project_id, name: selectedTask.project_name || 'Project', due_date: null }} members={members} canEdit onClose={() => setSelectedTask(null)} onSaved={load} /> : null}
  </div>;
}
