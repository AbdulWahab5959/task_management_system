import { CheckCircle2, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import TaskDetailModal, { type TaskMutationAction, type TaskProject } from '../../components/projects/TaskDetailModal';
import TaskRow from '../../components/projects/TaskRow';
import { useAuth } from '../../hooks/useAuth';
import { useTaskShortcut } from '../../hooks/useTaskShortcut';
import { useTenant } from '../../hooks/useTenant';
import { projectService } from '../../services/project.service';
import { taskService } from '../../services/task.service';
import { tenantMembersService } from '../../services/tenant-members.service';
import type { TenantMember } from '../../types/tenant-member.types';
import type { Project, Task, TaskPriority } from '../../types/project.types';
import { apiValidationMessage } from '../../utils/apiError';
import { showDashboardSuccess } from '../../utils/dashboardAlert';
import { canCreateTask, canDeleteTask, canUpdateTask } from '../../utils/taskPermissions';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
const filters: Array<{ value: TaskFilter; label: string }> = [{ value: 'all', label: 'All' }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'overdue', label: 'Overdue' }, { value: 'completed', label: 'Completed' }];
const priorities: Array<TaskPriority | ''> = ['', 'low', 'medium', 'high', 'urgent'];
const today = () => new Date().toISOString().slice(0, 10);

export default function MyTasksPage() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskDialog, setTaskDialog] = useState<{ task: Task | null } | null>(null);

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

  useEffect(() => {
    let active = true;
    if (!activeTenant) { queueMicrotask(() => { if (active) setProjects([]); }); return () => { active = false; }; }
    void projectService.list({ per_page: 50 }).then((response) => { if (active) setProjects(response.data.data); }).catch(() => { if (active) setProjects([]); });
    return () => { active = false; };
  }, [activeTenant]);

  const projectOptions = useMemo<TaskProject[]>(() => projects.map((project) => ({ id: project.id, name: project.name, due_date: project.due_date })), [projects]);
  const canAddTask = canCreateTask(activeTenant);
  const canDeleteTasks = canDeleteTask(activeTenant);
  const taskUpdatable = (task: Task) => canUpdateTask(activeTenant, task, user?.id);
  const dialogTask = taskDialog?.task ?? null;
  const openCreateTask = useCallback(() => setTaskDialog({ task: null }), []);
  useTaskShortcut(openCreateTask, Boolean(canAddTask && projectOptions.length));
  // The editor needs the destination project's deadline so its due-date ceiling
  // matches the rule TaskController enforces for the selected project.
  const dialogProject = useMemo<TaskProject | null>(() => {
    const projectId = dialogTask?.project_id ?? projectOptions[0]?.id;
    if (projectId === undefined) return null;
    return projectOptions.find((option) => option.id === projectId) ?? { id: projectId, name: dialogTask?.project_name || 'Project', due_date: null };
  }, [dialogTask, projectOptions]);

  const handleSaved = async (action: TaskMutationAction) => {
    await load();
    if (action === 'created' && dialogProject) void showDashboardSuccess('Task created', `${dialogProject.name} received the new task.`);
  };

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

  const renameTask = async (task: Task, title: string) => {
    try { await taskService.update(task.id, { title }); await load(); }
    catch (exception) { setError(apiValidationMessage(exception) ?? 'We could not rename that task. Please try again.'); }
  };

  const deleteTask = async (task: Task) => {
    try { await taskService.remove(task.id); await load(); }
    catch (exception) { setError(apiValidationMessage(exception) ?? 'We could not delete that task. Please try again.'); }
  };

  return <div className="pm-page pm-my-tasks">
    <header className="pm-page-header"><div><p className="pm-eyebrow">My work</p><h1>My Tasks</h1><p>A focused view of the work assigned to you across this workspace.</p></div>{canAddTask && projectOptions.length ? <button type="button" className="pm-button pm-button--primary" onClick={openCreateTask} aria-keyshortcuts="Q" title="Add task (Q)"><Plus aria-hidden="true" />Add task</button> : null}</header>
    <div className="pm-task-filters" role="group" aria-label="Task filters">{filters.map((item) => <button type="button" key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`pm-task-filter pm-task-filter--${item.value}${filter === item.value ? ' is-active' : ''}`}>{item.label}</button>)}</div>
    <div className="pm-list-toolbar pm-list-toolbar--tasks"><label className="pm-search"><span className="sr-only">Search my tasks</span><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="dashboard-control" /></label><label className="pm-select-label"><span>Priority</span><select aria-label="Filter tasks by priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | '')} className="dashboard-control">{priorities.map((item) => <option key={item} value={item}>{item ? `${item[0].toUpperCase()}${item.slice(1)} priority` : 'All priorities'}</option>)}</select></label></div>
    {error ? <div role="alert" className="pm-form-error pm-form-error--page">{error}</div> : null}
    {loading ? <ProfessionalLoader variant="table" label="Loading your tasks" detail="Syncing the latest assigned work" columns={4} /> : visible.length === 0 ? <section className="pm-empty-workspace"><EmptyState icon={<CheckCircle2 aria-hidden="true" />} title={search || priority || filter !== 'all' ? 'No tasks match this filter' : 'You’re all caught up'} description={search || priority || filter !== 'all' ? 'Try another filter or search term.' : 'Tasks assigned to you will appear here.'} /></section> : <section className="pm-my-task-groups" aria-label="My tasks">{groups.map((group) => <section key={group.title} className="pm-my-task-group"><header><h2>{group.title}</h2><span>{group.tasks.length}</span></header><div>{group.tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={(item) => setTaskDialog({ task: item })} onToggle={(item) => void toggleTask(item)} showProject canUpdate={taskUpdatable(task)} onSaveTitle={renameTask} onDelete={canDeleteTasks ? deleteTask : undefined} />)}</div></section>)}</section>}
    {taskDialog && dialogProject ? <TaskDetailModal task={dialogTask} project={dialogProject} projects={projectOptions} members={members} canEdit={dialogTask ? taskUpdatable(dialogTask) : canAddTask} canDelete={canDeleteTasks} onClose={() => setTaskDialog(null)} onSaved={handleSaved} /> : null}
  </div>;
}
