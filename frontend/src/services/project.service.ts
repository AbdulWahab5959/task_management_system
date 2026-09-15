import { api } from './api';
import type { PaginatedProjects, Project, ProjectDetail } from '../types/project.types';

export interface ProjectInput { name: string; description?: string; status?: string; start_date?: string; due_date?: string; }

export const projectService = {
  list(params: { page?: number; per_page?: number; search?: string; status?: string } = {}) {
    return api.get<PaginatedProjects>('/tenant/projects', { params, tenantScoped: true });
  },
  show(id: number) { return api.get<{ data: ProjectDetail }>(`/tenant/projects/${id}`, { tenantScoped: true }); },
  create(data: ProjectInput) { return api.post<{ data: Project }>('/tenant/projects', data, { tenantScoped: true }); },
  update(id: number, data: Partial<ProjectInput>) { return api.put<{ data: Project }>(`/tenant/projects/${id}`, data, { tenantScoped: true }); },
  remove(id: number) { return api.delete(`/tenant/projects/${id}`, { tenantScoped: true }); },
};
