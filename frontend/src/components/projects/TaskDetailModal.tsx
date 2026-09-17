import { Check, Circle, LoaderCircle, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { projectSectionService } from '../../services/project-section.service';
import { taskService } from '../../services/task.service';
import type { TenantMember } from '../../types/tenant-member.types';
import type { ProjectSection, Task, TaskDetail, TaskPriority, TaskStatus } from '../../types/project.types';

type TaskProject = { id: number; name: string; due_date: string | null };
type TaskFormState = { title: string; description: string; section_id: number | null; assignee_ids: number[]; status: TaskStatus; priority: TaskPriority; start_date: string; due_date: string };

const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const statuses: Array<{ value: TaskStatus; label: string }> = [{ value: 'todo', label: 'To do' }, { value: 'in_progress', label: 'In progress' }, { value: 'done', label: 'Done' }];
const emptySections: ProjectSection[] = [];

function taskForm(task: Task | null, sectionId: number | null): TaskFormState {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    section_id: task?.section_id ?? sectionId,
    assignee_ids: task?.assignee_ids ?? [],
    status: task?.status ?? 'todo',
    priority: task?.priority ?? 'medium',
    start_date: task?.start_date ?? '',
    due_date: task?.due_date ?? '',
  };
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'No due date';
}

interface TaskDetailModalProps {
  task: Task | null;
  project: TaskProject;
  members: TenantMember[];
  sections?: ProjectSection[];
  initialSectionId?: number | null;
  canEdit: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function TaskDetailModal({ task, project, members, sections: initialSections = emptySections, initialSectionId = null, canEdit, canDelete = false, onClose, onSaved }: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sections, setSections] = useState<ProjectSection[]>(initialSections);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [form, setForm] = useState<TaskFormState>(() => taskForm(task, initialSectionId));
  const [loadingDetail, setLoadingDetail] = useState(Boolean(task));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskSaving, setSubtaskSaving] = useState(false);

  const currentTask = detail ?? task;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setForm(taskForm(task, initialSectionId)); setDetail(null); } });
    return () => { active = false; };
  }, [task, initialSectionId]);

  useEffect(() => {
    let active = true;
    void projectSectionService.list(project.id).then((response) => { if (active) setSections(response.data.data); }).catch(() => { if (active) setSections(initialSections); });
    return () => { active = false; };
  }, [initialSections, project.id]);

  const hydrate = async () => {
    if (!task) return;
    setLoadingDetail(true);
    try {
      const response = await taskService.show(task.id);
      setDetail(response.data.data);
      setForm(taskForm(response.data.data, response.data.data.section_id));
    } catch {
      setError('Unable to load the latest task details. You can try again.');
    } finally { setLoadingDetail(false); }
  };

  useEffect(() => { queueMicrotask(() => { void hydrate(); }); }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    else onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        project_id: project.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        section_id: form.section_id,
        assignee_ids: form.assignee_ids,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
      };
      if (currentTask) await taskService.update(currentTask.id, payload);
      else await taskService.create(payload);
      await onSaved();
      close();
    } catch {
      setError('We could not save this task. Check the dates and workspace members, then try again.');
    } finally { setSaving(false); }
  };

  const toggleSubtask = async (subtask: Task) => {
    try {
      await taskService.update(subtask.id, { status: subtask.status === 'done' ? 'todo' : 'done' });
      await hydrate();
      await onSaved();
    } catch { setError('We could not update that subtask. Please try again.'); }
  };

  const addSubtask = async () => {
    if (!currentTask || !subtaskTitle.trim()) return;
    setSubtaskSaving(true);
    try {
      await taskService.create({ project_id: project.id, title: subtaskTitle.trim(), parent_task_id: currentTask.id, section_id: currentTask.section_id, priority: 'medium' });
      setSubtaskTitle('');
      await hydrate();
      await onSaved();
    } catch { setError('We could not add that subtask. Please try again.'); }
    finally { setSubtaskSaving(false); }
  };

  const deleteTask = async () => {
    if (!currentTask || !canDelete) return;
    setDeleting(true);
    setError('');
    try {
      await taskService.remove(currentTask.id);
      await onSaved();
      close();
    } catch { setError('We could not delete this task. Please try again.'); }
    finally { setDeleting(false); }
  };

  return (
    <dialog ref={dialogRef} className="pm-task-dialog" aria-label={currentTask ? `Task details: ${currentTask.title}` : 'Create task'} onClose={onClose} onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialogRef.current) close(); }}>
      <form className="pm-task-dialog__surface" onSubmit={submit}>
        <div className="pm-task-dialog__main">
          <div className="pm-task-dialog__crumb">{project.name}{form.section_id ? ` / ${sections.find((section) => section.id === form.section_id)?.name ?? 'Section'}` : ''}</div>
          <label className="sr-only" htmlFor="task-detail-title">Task title</label>
          <input id="task-detail-title" className="pm-task-dialog__title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Name this task" required disabled={!canEdit || saving} autoFocus />
          <button type="button" className="pm-task-dialog__close" onClick={close} aria-label="Close task details"><X aria-hidden="true" /></button>

          <section className="pm-task-dialog__block">
            <label className="pm-field-label" htmlFor="task-detail-description">Description</label>
            <textarea id="task-detail-description" className="dashboard-control pm-task-dialog__description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add context, decisions, or acceptance criteria…" disabled={!canEdit || saving} />
          </section>

          {currentTask ? <section className="pm-task-dialog__block">
            <div className="pm-task-dialog__block-heading"><h3>Subtasks</h3><span>{detail?.subtasks.length ?? 0}</span></div>
            {loadingDetail ? <p className="pm-task-dialog__quiet"><LoaderCircle aria-hidden="true" />Loading task details…</p> : detail?.subtasks.length ? <div className="pm-subtask-list">{detail.subtasks.map((subtask) => <div key={subtask.id} className={`pm-subtask${subtask.status === 'done' ? ' is-complete' : ''}`}><button type="button" onClick={() => void toggleSubtask(subtask)} disabled={!canEdit} aria-label={`${subtask.status === 'done' ? 'Mark incomplete' : 'Mark complete'}: ${subtask.title}`}>{subtask.status === 'done' ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}</button><span>{subtask.title}</span><small>{dateLabel(subtask.due_date)}</small></div>)}</div> : <p className="pm-task-dialog__quiet">Break this work into smaller, clear actions.</p>}
            {canEdit ? <div className="pm-subtask-form"><label className="sr-only" htmlFor="subtask-title">Subtask title</label><input id="subtask-title" className="dashboard-control" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add a subtask…" disabled={subtaskSaving} /><button type="button" className="pm-add-task-link" onClick={() => void addSubtask()} disabled={subtaskSaving}><Plus aria-hidden="true" />{subtaskSaving ? 'Adding…' : 'Add subtask'}</button></div> : null}
          </section> : null}
          {error ? <p role="alert" className="pm-form-error">{error}</p> : null}
          <div className="pm-task-dialog__footer">{currentTask && canDelete ? <button type="button" className="pm-button pm-button--danger" onClick={() => void deleteTask()} disabled={saving || deleting}>{deleting ? 'Deleting…' : 'Delete task'}</button> : null}<button type="button" className="pm-button" onClick={close} disabled={saving || deleting}>Cancel</button>{canEdit ? <button type="submit" className="pm-button pm-button--primary" disabled={saving || deleting}>{saving ? 'Saving…' : currentTask ? 'Save changes' : 'Create task'}</button> : null}</div>
        </div>

        <aside className="pm-task-dialog__meta" aria-label="Task metadata">
          <div><span>Project</span><strong>{project.name}</strong></div>
          <label><span>Section</span><select className="dashboard-control" value={form.section_id ?? ''} onChange={(event) => setForm({ ...form, section_id: event.target.value ? Number(event.target.value) : null })} disabled={!canEdit || saving}><option value="">No section</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
          <label><span>Assignee</span><select className="dashboard-control pm-task-dialog__assignees" multiple value={form.assignee_ids.map(String)} onChange={(event) => setForm({ ...form, assignee_ids: Array.from(event.target.selectedOptions, (option) => Number(option.value)) })} disabled={!canEdit || saving}>{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select><small>Use Ctrl/Cmd to select more than one person.</small></label>
          <label><span>Status</span><select className="dashboard-control" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })} disabled={!canEdit || saving}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <label><span>Priority</span><select className="dashboard-control" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })} disabled={!canEdit || saving}>{priorities.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
          <label><span>Start date</span><input type="date" className="dashboard-control" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} max={form.due_date || project.due_date || undefined} disabled={!canEdit || saving} /></label>
          <label><span>Due date</span><input type="date" className="dashboard-control" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} min={form.start_date || undefined} max={project.due_date || undefined} disabled={!canEdit || saving} /></label>
        </aside>
      </form>
    </dialog>
  );
}
