export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  interval: 'month' | 'year';
  features: string[];
  limits: Record<string, number | string>;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: Record<string, number | string>;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}