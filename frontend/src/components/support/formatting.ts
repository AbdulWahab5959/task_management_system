import type { SupportMessage, SupportMessageKind } from '../../types/support.types';

/** Local date key such as 2026-08-28 used to build date separators. */
function dateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function isNewDay(previousIso: string | undefined, currentIso: string): boolean {
  return previousIso === undefined || dateKey(previousIso) !== dateKey(currentIso);
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateKey(iso) === dateKey(today.toISOString())) return 'Today';
  if (dateKey(iso) === dateKey(yesterday.toISOString())) return 'Yesterday';

  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSeconds < 60) return 'now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 86400 * 7) return `${Math.floor(diffSeconds / 86400)}d`;

  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function classifyMessage(message: SupportMessage): SupportMessageKind {
  if (message.sender_role === 'system') {
    return message.meta?.type === 'handoff' ? 'handoff' : 'faq';
  }
  if (message.sender_role === 'super_admin') return 'support';
  return 'customer';
}

/** A stable dedup-by-id merge that preserves chronological order. */
export function mergeMessages(current: SupportMessage[], incoming: SupportMessage | SupportMessage[]): SupportMessage[] {
  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  const next = [...current];
  let changed = false;

  for (const message of incomingList) {
    if (!next.some((item) => item.id === message.id)) {
      next.push(message);
      changed = true;
    }
  }

  return changed ? next.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)) : current;
}

export function getInitials(name?: string, fallback = '?'): string {
  if (!name) return fallback;
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || fallback;
}