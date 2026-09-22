import { CalendarDays, FolderPlus, Pencil, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import ProjectSection from '../../components/projects/ProjectSection';
import TaskDetailModal, { type TaskProject } from '../../components/projects/TaskDetailModal';
import { useAuth } from '../../hooks/useAuth';
import { useTaskShortcut } from '../../hooks/useTaskShortcut';
import { useTenant } from '../../hooks/useTenant';
import { projectSectionService } from '../../services/project-section.service';
import { projectService } from '../../services/project.service';
import { taskService } from '../../services/task.service';
import { tenantMembersService } from '../../services/tenant-members.service';
import type { TenantMember } from '../../types/tenant-member.types';
import type { Project, ProjectDetail, ProjectSection as ProjectSectionType, Task } from '../../types/project.types';
import { apiValidationMessage } from '../../utils/apiError';
import { showDashboardToast } from '../../utils/dashboardAlert';
import { canCreateTask, canDeleteTask, canUpdateTask } from '../../utils/taskPermissions';

const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'No due date';
type TaskDialogState = { task: Task | null; sectionId: number | null } | null;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const projectId = Number(id);
  const canManageProject = Boolean(activeTenant?.role === 'owner' || activeTenant?.role === 'admin' || activeTenant?.permissions?.includes('projects.update'));
  const canAddTask = canCreateTask(activeTenant);
  const canDeleteTasks = canDeleteTask(activeTenant);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'active', start_date: '', due_date: '' });
  const [projectSaving, setProjectSaving] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [taskDialog, setTaskDialog] = useState<TaskDialogState>(null);

  const loadProject = useCallback(async (withPageLoader = true) => {
    if (!Number.isInteger(projectId)) { setError('This project link is invalid.'); setLoading(false); return; }
    if (withPageLoader) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const response = await projectService.show(projectId);
      setProject(response.data.data);
      setProjectForm({ name: response.data.data.name, description: response.data.data.description ?? '', status: response.data.data.status, start_date: response.data.data.start_date ?? '', due_date: response.data.data.due_date ?? '' });
    } catch { setError('Unable to load this project. Please try again.'); }
    finally { if (withPageLoader) setLoading(false); else setRefreshing(false); }
  }, [projectId]);

  useEffect(() => { queueMicrotask(() => { void loadProject(); }); }, [loadProject]);
  useEffect(() => { if (!activeTenant) return; void projectService.list({ per_page: 50 }).then((response) => setProjects(response.data.data)).catch(() => setProjects([])); }, [activeTenant]);
  useEffect(() => { if (!activeTenant) return; void tenantMembersService.list().then((response) => setMembers(response.data.data)).catch(() => setMembers([])); }, [activeTenant]);

  const roots = useMemo(() => project?.tasks.filter((task) => task.parent_task_id === null) ?? [], [project]);
  const subtasksByParent = useMemo(() => {
    const groups = new Map<number, Task[]>();
    for (const task of project?.tasks ?? []) {
      if (task.parent_task_id === null) continue;
      const children = groups.get(task.parent_task_id) ?? [];
      children.push(task);
      groups.set(task.parent_task_id, children);
    }
    return groups;
  }, [project]);
  const subtasksFor = useCallback((task: Task) => subtasksByParent.get(task.id) ?? [], [subtasksByParent]);
  const projectOptions = useMemo<TaskProject[]>(() => projects.map((item) => ({ id: item.id, name: item.name, due_date: item.due_date })), [projects]);
  const taskUpdatable = (task: Task) => canUpdateTask(activeTenant, task, user?.id);
  const openCreateTask = useCallback((sectionId: number | null) => setTaskDialog({ task: null, sectionId }), []);
  useTaskShortcut(() => openCreateTask(null), Boolean(project && canAddTask && !editing));

  const updateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setProjectSaving(true);
    try {
      await projectService.update(project.id, { ...projectForm, start_date: projectForm.start_date || undefined, due_date: projectForm.due_date || undefined });
      await loadProject(false);
      setEditing(false);
    } catch { setError('We could not save the project. Check the dates and try again.'); }
    finally { setProjectSaving(false); }
  };

  const createSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project || !sectionName.trim()) return;
    setSectionSaving(true);
    try { await projectSectionService.create(project.id, sectionName.trim()); setSectionName(''); setSectionFormOpen(false); await loadProject(false); }
    catch { setError('We could not create this section. Please try again.'); }
    finally { setSectionSaving(false); }
  };

  const openSectionForm = () => setSectionFormOpen(true);

  const toggleTask = async (task: Task) => {
    try { await taskService.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); await loadProject(false); }
    catch { setError('We could not update that task. Please try again.'); }
  };

  const renameTask = async (task: Task, title: string) => {
    try { await taskService.update(task.id, { title }); await loadProject(false); }
    catch (exception) { setError(apiValidationMessage(exception) ?? 'We could not rename that task. Please try again.'); }
  };

  const deleteTask = async (task: Task) => {
    try { await taskService.remove(task.id); await loadProject(false); }
    catch (exception) { setError(apiValidationMessage(exception) ?? 'We could not delete that task. Please try again.'); }
  };

  const renameSection = async (section: ProjectSectionType, name: string) => {
    if (!project) return;
    try {
      await projectSectionService.update(project.id, section.id, name);
      await loadProject(false);
      void showDashboardToast('success', 'Section renamed', `${name} is updated.`);
    } catch (exception) {
      const message = apiValidationMessage(exception) ?? 'We could not rename this section. Please try again.';
      setError(message);
      void showDashboardToast('error', 'Section was not renamed', message);
      throw exception;
    }
  };
  const moveSection = async (section: ProjectSectionType, direction: 'up' | 'down') => {
    if (!project) return;
    try {
      await projectSectionService.move(project.id, section.id, direction);
      await loadProject(false);
      void showDashboardToast('success', `Section moved ${direction}`, `${section.name} is now in its new position.`);
    } catch (exception) {
      const message = apiValidationMessage(exception) ?? 'We could not move this section. Please try again.';
      setError(message);
      void showDashboardToast('error', 'Section was not moved', message);
    }
  };
  const deleteSection = async (section: ProjectSectionType) => {
    if (!project) return;
    try {
      await projectSectionService.remove(project.id, section.id);
      await loadProject(false);
      void showDashboardToast('success', 'Section deleted', `${section.name} was removed from the project.`);
    } catch (exception) {
      const message = apiValidationMessage(exception) ?? 'Only empty sections can be deleted. Move or delete the tasks first.';
      setError(message);
      void showDashboardToast('error', 'Section was not deleted', message);
    }
  };
  if (loading) return <ProfessionalLoader label="Loading project" detail="Preparing project details and tasks" />;
  if (!project) return <section className="pm-empty-workspace"><EmptyState title="Project unavailable" description={error || 'This project could not be found.'} action={<Link to="/dashboard/projects" className="pm-text-link">Back to projects</Link>} /></section>;

  return <div className="pm-workspace">
    <aside className="pm-project-nav" aria-label="Project navigation"><div className="pm-project-nav__heading"><span>My Projects</span></div><nav>{projects.map((item) => <Link key={item.id} to={`/dashboard/projects/${item.id}`} className={item.id === project.id ? 'is-active' : ''}><span>{item.name}</span><small>{item.progress_percent}%</small></Link>)}</nav></aside>
    <main className="pm-project-document">
      <div className="pm-mobile-project-picker"><label htmlFor="project-picker">Project</label><select id="project-picker" value={project.id} onChange={(event) => navigate(`/dashboard/projects/${event.target.value}`)} className="dashboard-control">{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <header className="pm-project-header"><div className="pm-project-header__crumb"><Link to="/dashboard/projects">My Projects</Link><span>/</span><span>{project.name}</span></div>{editing ? <form className="pm-project-edit" onSubmit={updateProject}><label>Project name<input value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} className="dashboard-control" required /></label><label>Description<textarea value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} className="dashboard-control" rows={3} /></label><div><label>Status<select value={projectForm.status} onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })} className="dashboard-control"><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label><label>Start date<input type="date" value={projectForm.start_date} onChange={(event) => setProjectForm({ ...projectForm, start_date: event.target.value })} className="dashboard-control" /></label><label>Due date<input type="date" min={projectForm.start_date || undefined} value={projectForm.due_date} onChange={(event) => setProjectForm({ ...projectForm, due_date: event.target.value })} className="dashboard-control" /></label></div><footer><button type="button" className="pm-button" onClick={() => setEditing(false)} disabled={projectSaving}>Cancel</button><button className="pm-button pm-button--primary" disabled={projectSaving}>{projectSaving ? 'Saving…' : 'Save project'}</button></footer></form> : <><div className="pm-project-header__title"><div><h1>{project.name}</h1><p>{project.description || 'Add a description to give this project a clear purpose.'}</p></div></div>{sectionFormOpen ? <form id="new-section-form" className="pm-new-section pm-new-section--header" onSubmit={createSection}><label htmlFor="new-section-name">New section</label><input id="new-section-name" value={sectionName} onChange={(event) => setSectionName(event.target.value)} placeholder="e.g. Phase 1 — Planning" className="dashboard-control" autoFocus /><div className="pm-new-section__actions"><button type="button" className="pm-button" onClick={() => { setSectionName(''); setSectionFormOpen(false); }} disabled={sectionSaving}>Cancel</button><button className="pm-button pm-button--primary" disabled={sectionSaving}><Plus aria-hidden="true" />{sectionSaving ? 'Adding…' : 'Add section'}</button></div></form> : null}<div className="pm-project-metadata"><span className={`pm-project-status pm-project-status--${project.status}`}>{project.status}</span><span><CalendarDays aria-hidden="true" />{dateLabel(project.due_date)}</span><span><i>{project.progress_percent}%</i> complete</span><span><Users aria-hidden="true" />{members.length || '—'} workspace members</span></div><div className="pm-project-progress"><div role="progressbar" aria-valuenow={project.progress_percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${project.progress_percent}%` }} /></div><span>{project.tasks_completed} of {project.tasks_total} tasks complete</span></div><div className="pm-project-header__actions">{canAddTask ? <button type="button" className="pm-button pm-button--primary" onClick={() => openCreateTask(null)} aria-keyshortcuts="Q" title="Add task (Q)"><Plus aria-hidden="true" />Add task</button> : null}{canManageProject ? <button type="button" className="pm-button" onClick={openSectionForm} aria-controls="new-section-form" aria-expanded={sectionFormOpen}><Plus aria-hidden="true" />Add section</button> : null}{canManageProject ? <button type="button" className="pm-button" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Edit project</button> : null}</div></>}</header>
      {error ? <div role="alert" className="pm-form-error pm-form-error--page">{error}</div> : null}
      {refreshing ? <div className="pm-inline-loader">Updating project…</div> : null}
      <div className="pm-section-list">{project.sections.map((section) => <ProjectSection key={section.id} section={section} title={section.name} tasks={roots.filter((task) => task.section_id === section.id)} subtasksFor={subtasksFor} canManage={canManageProject} canCreateTask={canAddTask} canUpdateTasks={taskUpdatable} onOpenTask={(task) => setTaskDialog({ task, sectionId: task.section_id })} onToggleTask={(task) => void toggleTask(task)} onAddTask={openCreateTask} onRename={renameSection} onMove={moveSection} onDelete={deleteSection} canDeleteTasks={canDeleteTasks} onSaveTaskTitle={renameTask} onDeleteTask={deleteTask} />)}{roots.some((task) => task.section_id === null) ? <ProjectSection section={null} title="Unsorted work" tasks={roots.filter((task) => task.section_id === null)} subtasksFor={subtasksFor} canManage={false} canCreateTask={canAddTask} canUpdateTasks={taskUpdatable} onOpenTask={(task) => setTaskDialog({ task, sectionId: null })} onToggleTask={(task) => void toggleTask(task)} onAddTask={openCreateTask} canDeleteTasks={canDeleteTasks} onSaveTaskTitle={renameTask} onDeleteTask={deleteTask} /> : null}</div>
      {project.sections.length === 0 && roots.length === 0 ? <section className="pm-empty-workspace"><EmptyState icon={<FolderPlus aria-hidden="true" />} title="No sections or tasks yet" description="Start with a phase, then add the first clear action." action={canManageProject ? <button type="button" className="pm-button pm-button--primary" onClick={openSectionForm}><Plus aria-hidden="true" />Add section</button> : undefined} /></section> : null}
    </main>
    {taskDialog ? <TaskDetailModal task={taskDialog.task} project={{ id: project.id, name: project.name, due_date: project.due_date }} projects={projectOptions} members={members} sections={project.sections} initialSectionId={taskDialog.sectionId} canEdit={taskDialog.task ? taskUpdatable(taskDialog.task) : canAddTask} canDelete={canDeleteTasks} onClose={() => setTaskDialog(null)} onSaved={() => loadProject(false)} /> : null}
  </div>;
}
