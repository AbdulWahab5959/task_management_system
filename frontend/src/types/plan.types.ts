export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  interval: 'month' | 'year';
  amount?: string;
  amount_minor?: number;
  currency?: string;
  billing_interval?: 'month' | 'year' | null;
  stripe_price_id?: string | null;
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
  stripe_price_id?: string | null;
  features: string[];
  limits: Record<string, number | string>;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}
