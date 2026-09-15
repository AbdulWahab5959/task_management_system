import { api } from './api';
import type { PaginatedTasks, Task } from '../types/project.types';

export interface TaskInput { project_id: number; title: string; description?: string; status?: string; priority?: string; assigned_to?: number | null; assignee_ids?: number[]; due_date?: string | null; }

export const taskService = {
  list(params: Record<string, string | number | boolean | undefined> = {}) { return api.get<PaginatedTasks>('/tenant/tasks', { params, tenantScoped: true }); },
  create(data: TaskInput) { return api.post<{ data: Task }>('/tenant/tasks', data, { tenantScoped: true }); },
  update(id: number, data: Partial<TaskInput>) { return api.put<{ data: Task }>(`/tenant/tasks/${id}`, data, { tenantScoped: true }); },
  remove(id: number) { return api.delete(`/tenant/tasks/${id}`, { tenantScoped: true }); },
};
