import { api } from './api';
import type { ProjectSection } from '../types/project.types';

export const projectSectionService = {
  list(projectId: number) {
    return api.get<{ data: ProjectSection[] }>(`/tenant/projects/${projectId}/sections`, { tenantScoped: true });
  },
  create(projectId: number, name: string) {
    return api.post<{ data: ProjectSection }>(`/tenant/projects/${projectId}/sections`, { name }, { tenantScoped: true });
  },
  update(projectId: number, sectionId: number, name: string) {
    return api.put<{ data: ProjectSection }>(`/tenant/projects/${projectId}/sections/${sectionId}`, { name }, { tenantScoped: true });
  },
  move(projectId: number, sectionId: number, direction: 'up' | 'down') {
    return api.put<{ data: ProjectSection }>(`/tenant/projects/${projectId}/sections/${sectionId}/move`, { direction }, { tenantScoped: true });
  },
  remove(projectId: number, sectionId: number) {
    return api.delete(`/tenant/projects/${projectId}/sections/${sectionId}`, { tenantScoped: true });
  },
};
