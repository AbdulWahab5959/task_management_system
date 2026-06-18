export type ContactMessageStatus = 'new' | 'read' | 'replied';

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginatedContactMessages {
  data: ContactMessage[];
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}
