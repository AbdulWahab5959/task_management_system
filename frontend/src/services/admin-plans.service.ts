import { api } from './api';
import type { Plan, PlanFormData } from '../types/plan.types';

export const adminPlansService = {
  list() {
    return api.get<Plan[]>('/admin/plans');
  },

  get(id: number) {
    return api.get<Plan>(`/admin/plans/${id}`);
  },

  create(data: PlanFormData) {
    return api.post<Plan>('/admin/plans', data);
  },

  update(id: number, data: Partial<PlanFormData>) {
    return api.put<Plan>(`/admin/plans/${id}`, data);
  },

  delete(id: number) {
    return api.delete(`/admin/plans/${id}`);
  },
};