import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ProjectSection as ProjectSectionType, Task } from '../../types/project.types';
import TaskQuickAdd, { type QuickTaskInput } from './TaskQuickAdd';
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
  onAddTask: (task: QuickTaskInput, sectionId: number | null) => Promise<void>;
  onRename?: (section: ProjectSectionType, name: string) => Promise<void>;
  onMove?: (section: ProjectSectionType, direction: 'up' | 'down') => Promise<void>;
  onDelete?: (section: ProjectSectionType) => Promise<void>;
}

export default function ProjectSection({ section, title, tasks, canManage, canCreateTask, canUpdateTasks, onOpenTask, onToggleTask, onAddTask, onRename, onMove, onDelete }: ProjectSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  const [saving, setSaving] = useState(false);

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!section || !name.trim() || !onRename) return;
    setSaving(true);
    try {
      await onRename(section, name.trim());
      setEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <section className="pm-project-section" aria-label={title}>
      <header className="pm-project-section__header">
        <button type="button" className="pm-project-section__collapse" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
          {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        {editing ? <form className="pm-section-name-form" onSubmit={saveName}><label className="sr-only" htmlFor={`section-name-${section?.id}`}>Section name</label><input id={`section-name-${section?.id}`} value={name} onChange={(event) => setName(event.target.value)} className="dashboard-control" autoFocus /><button className="pm-inline-action" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></form> : <button type="button" className="pm-project-section__title" onClick={() => setCollapsed((value) => !value)}>{title}<span>{tasks.length}</span></button>}
        {section && canManage ? <div className="pm-section-actions"><button type="button" aria-label={`Section actions for ${title}`} className="pm-icon-button" onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal aria-hidden="true" /></button>{menuOpen ? <div className="pm-section-actions__menu"><button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}><Pencil aria-hidden="true" />Rename</button><button type="button" onClick={() => void onMove?.(section, 'up')}>Move up</button><button type="button" onClick={() => void onMove?.(section, 'down')}>Move down</button>{tasks.length === 0 ? <button type="button" className="is-danger" onClick={() => void onDelete?.(section)}><Trash2 aria-hidden="true" />Delete</button> : null}</div> : null}</div> : null}
      </header>
      {!collapsed ? <div className="pm-project-section__body">{tasks.length ? <div>{tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={onOpenTask} onToggle={onToggleTask} canUpdate={canUpdateTasks(task)} />)}</div> : <p className="pm-project-section__empty">No tasks in this section yet.</p>}{canCreateTask ? <TaskQuickAdd onSubmit={(task) => onAddTask(task, section?.id ?? null)} /> : null}</div> : null}
    </section>
  );
}
