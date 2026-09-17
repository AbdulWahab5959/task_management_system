import { CalendarDays, Check, Circle } from 'lucide-react';
import type { Task, TaskPriority } from '../../types/project.types';

const priorityClass: Record<TaskPriority, string> = {
  low: 'task-priority-badge task-priority-badge--low',
  medium: 'task-priority-badge task-priority-badge--medium',
  high: 'task-priority-badge task-priority-badge--high',
  urgent: 'task-priority-badge task-priority-badge--urgent',
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function statusLabel(status: Task['status']) {
  return status === 'in_progress' ? 'In progress' : status === 'done' ? 'Done' : 'To do';
}

interface TaskRowProps {
  task: Task;
  onOpen: (task: Task) => void;
  onToggle?: (task: Task) => void;
  canUpdate?: boolean;
  showProject?: boolean;
}

export default function TaskRow({ task, onOpen, onToggle, canUpdate = true, showProject = false }: TaskRowProps) {
  const completed = task.status === 'done';
  const context = [
    showProject ? task.project_name : task.section_name,
    !showProject && task.assignees.length ? task.assignees.map((person) => person.name).join(', ') : null,
  ].filter(Boolean).join(' · ');

  return (
    <article className={`pm-task-row${completed ? ' is-complete' : ''}`}>
      <button
        type="button"
        className="pm-task-row__check"
        aria-label={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
        disabled={!canUpdate}
        onClick={() => onToggle?.(task)}
      >
        {completed ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
      </button>
      <button type="button" className="pm-task-row__content" onClick={() => onOpen(task)}>
        <span className="pm-task-row__title">{task.title}</span>
        {context ? <span className="pm-task-row__context">{context}</span> : null}
      </button>
      <div className="pm-task-row__meta" aria-label={`Metadata for ${task.title}`}>
        <span className={priorityClass[task.priority]}>{task.priority}</span>
        {task.due_date ? <span className="pm-task-row__date"><CalendarDays aria-hidden="true" />{formatDate(task.due_date)}</span> : null}
        <span className="pm-task-row__status">{statusLabel(task.status)}</span>
      </div>
    </article>
  );
}
