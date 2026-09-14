export type SupportStatus = 'open' | 'pending' | 'closed';

export interface SupportUser { id: number; name: string; email?: string; }
export interface SupportOrganization { id: number; name: string; }

export type SupportMessageKind = 'customer' | 'support' | 'faq' | 'handoff';

export interface SupportMessageMeta {
  type?: 'faq' | 'handoff';
  slug?: string;
  question?: string;
}

export interface SupportMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: string;
  message: string;
  read_at: string | null;
  created_at: string;
  meta?: SupportMessageMeta | null;
  sender?: SupportUser;
}

export interface SupportMessagePage {
  data: SupportMessage[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface SupportConversation {
  id: number;
  user_id: number;
  organization_id: number;
  status: SupportStatus;
  last_message_at: string | null;
  user?: SupportUser;
  organization?: SupportOrganization;
  latest_message?: SupportMessage;
  unread_count?: number;
  messages?: SupportMessage[];
}

export interface SupportFaq { slug: string; question: string; }
export interface SupportFaqCategory { category: string; questions: SupportFaq[]; }

export const MAX_MESSAGE_LENGTH = 2000;
