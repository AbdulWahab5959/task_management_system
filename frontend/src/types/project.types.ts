export type ProjectStatus = 'active' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectPerson { id: number; name: string; email: string; }

export interface ProjectSection {
  id: number;
  project_id: number;
  name: string;
  position: number;
  tasks_total: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_by: number;
  creator: ProjectPerson | null;
  tasks_total: number;
  tasks_completed: number;
  progress_percent: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface Task {
  id: number;
  project_id: number;
  project_name: string | null;
  section_id: number | null;
  section_name: string | null;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: number | null;
  assignee: ProjectPerson | null;
  assignee_ids: number[];
  assignees: ProjectPerson[];
  created_by: number;
  creator: ProjectPerson | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PaginatedProjects { data: Project[]; meta: { current_page: number; last_page: number; per_page: number; total: number }; }
export interface PaginatedTasks { data: Task[]; meta: { current_page: number; last_page: number; per_page: number; total: number }; }
export interface TaskDetail extends Task { subtasks: Task[]; }
export interface ProjectDetail extends Project { sections: ProjectSection[]; tasks: Task[]; }
