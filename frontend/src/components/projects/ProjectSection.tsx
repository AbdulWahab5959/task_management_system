import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { ProjectSection as ProjectSectionType, Task } from '../../types/project.types';
import TaskRow from './TaskRow';

interface ProjectSectionProps {
  section: ProjectSectionType | null;
  title: string;
  tasks: Task[];
  canManage: boolean;
  canCreateTask: boolean;
  canUpdateTasks: (task: Task) => boolean;
  onOpenTask: (task: Task) => void;
  onToggleTask: (task: Task) => void;
  onAddTask: (sectionId: number | null) => void;
  subtasksFor: (task: Task) => Task[];
  canDeleteTasks?: boolean;
  onSaveTaskTitle?: (task: Task, title: string) => Promise<void>;
  onDeleteTask?: (task: Task) => Promise<void>;
  onRename?: (section: ProjectSectionType, name: string) => Promise<void>;
  onMove?: (section: ProjectSectionType, direction: 'up' | 'down') => Promise<void>;
  onDelete?: (section: ProjectSectionType) => Promise<void>;
  actionBusy?: 'rename' | 'move-up' | 'move-down' | 'delete' | null;
  actionsDisabled?: boolean;
}

export default function ProjectSection({ section, title, tasks, canManage, canCreateTask, canUpdateTasks, onOpenTask, onToggleTask, onAddTask, subtasksFor, canDeleteTasks, onSaveTaskTitle, onDeleteTask, onRename, onMove, onDelete, actionBusy = null, actionsDisabled = false }: ProjectSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  const [saving, setSaving] = useState(false);
  const [localActionBusy, setLocalActionBusy] = useState<'rename' | 'move-up' | 'move-down' | 'delete' | null>(null);
  const busyAction = actionBusy ?? localActionBusy;

  const runAction = async (action: 'rename' | 'move-up' | 'move-down' | 'delete', callback: () => Promise<void> | void) => {
    setLocalActionBusy(action);
    setMenuOpen(false);
    try { await callback(); }
    finally { setLocalActionBusy(null); }
  };

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!section || !name.trim() || !onRename) return;
    setSaving(true);
    try {
      await runAction('rename', () => onRename(section, name.trim()));
      setEditing(false);
    } catch { /* The page-level toast and alert own the error feedback. */ }
    finally { setSaving(false); }
  };

  const actionLabel = busyAction === 'rename' ? 'Saving section' : busyAction === 'move-up' || busyAction === 'move-down' ? 'Moving section' : busyAction === 'delete' ? 'Deleting section' : '';
  const loadingDots = <span className="pm-loading-dots" aria-hidden="true"><i /><i /><i /></span>;

  const renderTask = (task: Task, nested = false): ReactNode => <div key={task.id} className={nested ? 'pm-subtask-row' : undefined}>
    <TaskRow task={task} onOpen={onOpenTask} onToggle={onToggleTask} canUpdate={canUpdateTasks(task)} canDelete={canDeleteTasks} nested={nested} onSaveTitle={onSaveTaskTitle} onDelete={onDeleteTask} />
    {subtasksFor(task).map((subtask) => renderTask(subtask, true))}
  </div>;

  return (
    <section className="pm-project-section" aria-label={title}>
      <header className="pm-project-section__header" aria-busy={Boolean(busyAction)}>
        <button type="button" className="pm-project-section__collapse" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
          {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        {editing ? <form className="pm-section-name-form" onSubmit={saveName}><label className="sr-only" htmlFor={`section-name-${section?.id}`}>Section name</label><input id={`section-name-${section?.id}`} value={name} onChange={(event) => setName(event.target.value)} className="dashboard-control" autoFocus /><button className="pm-inline-action" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></form> : <button type="button" className="pm-project-section__title" onClick={() => setCollapsed((value) => !value)}>{title}<span>{section ? section.tasks_total : tasks.length}</span></button>}
        {busyAction ? <span className="pm-section-action-status" role="status" aria-live="polite">{loadingDots}{actionLabel}</span> : null}
        {section && canManage ? <div className="pm-section-actions"><button type="button" aria-label={`Section actions for ${title}`} className="pm-icon-button" onClick={() => setMenuOpen((value) => !value)} disabled={Boolean(busyAction) || actionsDisabled}>{busyAction ? loadingDots : <MoreHorizontal aria-hidden="true" />}</button>{menuOpen ? <div className="pm-section-actions__menu"><button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }} disabled={Boolean(busyAction) || actionsDisabled}><Pencil aria-hidden="true" />Rename</button><button type="button" onClick={() => void runAction('move-up', () => onMove?.(section, 'up'))} disabled={Boolean(busyAction) || actionsDisabled}>Move up</button><button type="button" onClick={() => void runAction('move-down', () => onMove?.(section, 'down'))} disabled={Boolean(busyAction) || actionsDisabled}>Move down</button>{tasks.length === 0 ? <button type="button" className="is-danger" onClick={() => void runAction('delete', () => onDelete?.(section))} disabled={Boolean(busyAction) || actionsDisabled}><Trash2 aria-hidden="true" />Delete</button> : null}</div> : null}</div> : null}
      </header>
      {!collapsed ? <div className="pm-project-section__body">{tasks.length ? <div>{tasks.map((task) => renderTask(task))}</div> : <p className="pm-project-section__empty">No tasks in this section yet.</p>}{canCreateTask ? <button type="button" className="pm-add-task-link" onClick={() => onAddTask(section?.id ?? null)}><Plus aria-hidden="true" />Add task</button> : null}</div> : null}
    </section>
  );
}
