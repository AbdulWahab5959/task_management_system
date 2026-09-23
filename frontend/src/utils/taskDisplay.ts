import type { Task, TaskStatus } from '../types/project.types';

/** `Mon d` short date used in task rows and filters. */
export function formatShortDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export function taskStatusLabel(status: TaskStatus) {
  return status === 'in_progress' ? 'In progress' : status === 'done' ? 'Done' : 'To do';
}

/** Local calendar day, matching the `YYYY-MM-DD` comparisons used by My Tasks grouping. */
export function todayDateString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Overdue means unfinished with a due date before today. Never applies to done tasks. */
export function isTaskOverdue(task: Pick<Task, 'status' | 'due_date'>, today: string) {
  return task.status !== 'done' && Boolean(task.due_date && task.due_date < today);
}

/** First letter of the first two words, uppercased, for avatar circles. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
