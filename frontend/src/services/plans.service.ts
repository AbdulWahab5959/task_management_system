import { api } from './api';
import type { Plan } from '../types/plan.types';

export const plansService = {
  getAll() {
    return api.get<Plan[]>('/plans');
  },
};