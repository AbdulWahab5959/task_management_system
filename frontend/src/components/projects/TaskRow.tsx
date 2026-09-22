import { CalendarDays, Check, Circle, Pencil, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Task } from '../../types/project.types';
import { formatShortDate, initials, isTaskOverdue, taskStatusLabel, todayDateString } from '../../utils/taskDisplay';

const priorityClass: Record<Task['priority'], string> = {
  low: 'task-priority-badge task-priority-badge--low',
  medium: 'task-priority-badge task-priority-badge--medium',
  high: 'task-priority-badge task-priority-badge--high',
  urgent: 'task-priority-badge task-priority-badge--urgent',
};

interface TaskRowProps {
  task: Task;
  onOpen: (task: Task) => void;
  onToggle?: (task: Task) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
  showProject?: boolean;
  nested?: boolean;
  onSaveTitle?: (task: Task, title: string) => Promise<void>;
  onDelete?: (task: Task) => Promise<void>;
}
export default function TaskRow({ task, onOpen, onToggle, canUpdate = true, canDelete = false, showProject = false, nested = false, onSaveTitle, onDelete }: TaskRowProps) {
  const completed = task.status === 'done';
  const overdue = isTaskOverdue(task, todayDateString());
  const dueLabel = formatShortDate(task.due_date);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [saving, setSaving] = useState(false);

  const context = [
    showProject ? task.project_name : task.section_name,
    !showProject && task.assignees.length ? task.assignees.map((person) => person.name).join(', ') : null,
  ].filter(Boolean).join(' · ');

  const saveTitle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSaveTitle || saving) return;
    const next = title.trim();
    if (!next || next === task.title) { setEditing(false); setTitle(task.title); return; }
    setSaving(true);
    try {
      await onSaveTitle(task, next);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const removeTask = () => {
    if (!onDelete || saving) return;
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    void onDelete(task);
  };

  const avatarStack = task.assignees.length ? (
    <span className="pm-task-row__avatars" aria-label={`Assigned to ${task.assignees.map((person) => person.name).join(', ')}`}>
      {task.assignees.slice(0, 3).map((person) => <span key={person.id} className="pm-avatar" title={person.name}>{initials(person.name)}</span>)}
      {task.assignees.length > 3 ? <span className="pm-avatar pm-avatar--more" title={`${task.assignees.length - 3} more`}>+{task.assignees.length - 3}</span> : null}
    </span>
  ) : null;

  return (
    <article className={`pm-task-row${nested ? ' is-subtask' : ''}${completed ? ' is-complete' : ''}${overdue ? ' is-overdue' : ''}${editing ? ' is-editing' : ''}`}>
      <button
        type="button"
        className="pm-task-row__check"
        aria-label={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
        disabled={!canUpdate || editing}
        onClick={() => onToggle?.(task)}
      >
        {completed ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
      </button>
      {editing ? (
        <form className="pm-task-row__editor" onSubmit={saveTitle}>
          <label className="sr-only" htmlFor={`task-title-${task.id}`}>Task title</label>
          <input id={`task-title-${task.id}`} value={title} onChange={(event) => setTitle(event.target.value)} className="dashboard-control pm-task-row__title-input" autoFocus disabled={saving} onKeyDown={(event) => { if (event.key === 'Escape') { setTitle(task.title); setEditing(false); } }} />
          <button type="submit" className="pm-inline-action" disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="pm-icon-button" aria-label="Cancel renaming" disabled={saving} onClick={() => { setTitle(task.title); setEditing(false); }}><X aria-hidden="true" /></button>
        </form>
      ) : (
        <button type="button" className="pm-task-row__content" onClick={() => onOpen(task)}>
          <span className="pm-task-row__title">{task.title}</span>
          {context ? <span className="pm-task-row__context">{context}</span> : null}
        </button>
      )}
      <div className="pm-task-row__meta" aria-label={`Metadata for ${task.title}`}>
        {avatarStack}
        <span className={priorityClass[task.priority]}>{task.priority}</span>
        <span className={`pm-task-row__date${overdue ? ' is-overdue' : ''}${dueLabel ? '' : ' is-empty'}`}><CalendarDays aria-hidden="true" />{dueLabel ?? 'No due date'}{overdue ? <span className="pm-overdue-chip">Overdue</span> : null}</span>
        <span className="pm-task-row__status">{taskStatusLabel(task.status)}</span>
        {onSaveTitle && canUpdate && !editing ? <span className="pm-task-row__actions"><button type="button" className="pm-icon-button" aria-label={`Rename task: ${task.title}`} onClick={() => { setTitle(task.title); setEditing(true); }}><Pencil aria-hidden="true" /></button>{canDelete && onDelete ? <button type="button" className="pm-icon-button pm-task-row__delete" aria-label={`Delete task: ${task.title}`} onClick={removeTask}><Trash2 aria-hidden="true" /></button> : null}</span> : null}
      </div>
    </article>
  );
}
