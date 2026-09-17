import { Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import type { TaskPriority, TaskStatus } from '../../types/project.types';

export interface QuickTaskInput {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

interface TaskQuickAddProps {
  onSubmit: (task: QuickTaskInput) => Promise<void>;
  onCancel?: () => void;
  label?: string;
}

export default function TaskQuickAdd({ onSubmit, onCancel, label = 'Add task' }: TaskQuickAddProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    setTitle('');
    setStatus('todo');
    setPriority('medium');
    setError('');
    onCancel?.();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ title: title.trim(), status, priority });
      close();
    } catch {
      setError('Unable to add this task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return <button type="button" className="pm-add-task-link" onClick={() => setOpen(true)}><Plus aria-hidden="true" />{label}</button>;
  }

  return (
    <form className="pm-quick-add" onSubmit={submit}>
      <div className="pm-quick-add__field pm-quick-add__field--title">
        <label className="sr-only" htmlFor={`${fieldId}-title`}>Task title</label>
        <input id={`${fieldId}-title`} autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title…" className="dashboard-control" />
      </div>
      <div className="pm-quick-add__field">
        <label htmlFor={`${fieldId}-status`}>Progress</label>
        <select id={`${fieldId}-status`} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="dashboard-control" disabled={saving}>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className="pm-quick-add__field">
        <label htmlFor={`${fieldId}-priority`}>Priority</label>
        <select id={`${fieldId}-priority`} value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="dashboard-control" disabled={saving}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div className="pm-quick-add__actions">
        <button type="submit" className="pm-button pm-button--primary" disabled={saving}>{saving ? 'Adding…' : 'Add task'}</button>
        <button type="button" className="pm-button" onClick={close} disabled={saving}>Cancel</button>
      </div>
      {error ? <p className="pm-form-error" role="alert">{error}</p> : null}
    </form>
  );
}
