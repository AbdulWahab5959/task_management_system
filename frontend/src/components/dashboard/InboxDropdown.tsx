import { CheckCheck, Inbox, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminSupportService, supportService } from '../../services/support.service';
import type { SupportConversation, SupportMessage } from '../../types/support.types';
import { formatRelativeTime } from '../support/formatting';
import { cn } from '../../utils/cn';

interface InboxDropdownProps {
  isSuperAdmin: boolean;
  tenantId?: number;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

interface InboxItem {
  id: number;
  title: string;
  body: string;
  time: string | null;
  unread: boolean;
}

function messageItem(message: SupportMessage): InboxItem {
  return {
    id: message.id,
    title: message.sender?.name ?? (message.sender_role === 'super_admin' ? 'LaunchStack support' : 'Support conversation'),
    body: message.message,
    time: message.created_at,
    unread: message.sender_role === 'super_admin' && !message.read_at,
  };
}

function conversationItem(conversation: SupportConversation): InboxItem {
  return {
    id: conversation.id,
    title: conversation.organization?.name ?? conversation.user?.name ?? 'Support conversation',
    body: conversation.latest_message?.message ?? 'Open this conversation to view the latest messages.',
    time: conversation.last_message_at,
    unread: (conversation.unread_count ?? 0) > 0,
  };
}

export default function InboxDropdown({ isSuperAdmin, tenantId, unreadCount, onUnreadCountChange }: InboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fullInboxPath = isSuperAdmin ? '/dashboard/support' : '/dashboard/support-center';

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const response = await adminSupportService.list();
        setItems(response.data.data.data.map(conversationItem).slice(0, 5));
      } else if (tenantId) {
        const response = await supportService.messages(tenantId, { limit: 6 });
        setItems([...response.data.data].reverse().slice(0, 5).map(messageItem));
      } else {
        setItems([]);
      }
    } catch {
      setError('Inbox could not be loaded. Try again.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, tenantId]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) void fetchInbox();
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const response = await adminSupportService.list();
        await Promise.all(response.data.data.data.filter((conversation) => (conversation.unread_count ?? 0) > 0).map((conversation) => adminSupportService.markRead(conversation.id)));
      } else if (tenantId) {
        await supportService.markRead(tenantId);
      }
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
      onUnreadCountChange(0);
    } catch {
      setError('We could not mark the inbox as read. Try again.');
    } finally {
      setMarkingAll(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="dashboard-inbox-panel"
        aria-label={`Inbox${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#dfe9c4] bg-white/90 text-slate-500 shadow-sm shadow-[#5f7e1a]/10 transition-colors duration-150 hover:border-[#b8d85d] hover:bg-[#f7fde7] hover:text-[#0b0d0c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b8d85d]/35"
      >
        <Inbox className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>

      {open ? (
        <div id="dashboard-inbox-panel" role="dialog" aria-label="Inbox" className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-[#dfe9c4] bg-white shadow-xl shadow-[#5f7e1a]/15 ring-1 ring-[#5f7e1a]/5 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Inbox</h3>
              <p className="mt-0.5 text-xs text-slate-500" aria-live="polite">{unreadCount > 0 ? `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : items.length > 0 ? `${items.length} recent message${items.length === 1 ? '' : 's'}` : 'Nothing new in your inbox'}</p>
            </div>
            {unreadCount > 0 ? <button type="button" onClick={() => void handleMarkAllRead()} disabled={markingAll} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#536c1e] transition-colors hover:bg-[#f7fde7] disabled:cursor-wait disabled:opacity-60"><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{markingAll ? 'Saving…' : 'Mark all read'}</button> : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error ? <div className="px-4 py-6 text-center" role="alert"><p className="text-sm font-medium text-slate-700">{error}</p><button type="button" onClick={() => void fetchInbox()} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[#dfe9c4] px-3 text-xs font-semibold text-[#536c1e] hover:bg-[#f7fde7]">Try again</button></div> : loading ? <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading inbox…</div> : items.length === 0 ? <div className="flex flex-col items-center px-4 py-8 text-center"><Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" /><p className="mt-2 text-sm font-medium text-slate-600">Your inbox is empty</p><p className="mt-0.5 text-xs text-slate-400">New support messages will appear here.</p></div> : <ul role="list" className="divide-y divide-slate-100">{items.map((item) => <li key={item.id}><Link to={fullInboxPath} onClick={() => setOpen(false)} className={cn('flex gap-3 px-4 py-3 transition hover:bg-slate-50', item.unread && 'bg-[#f7fde7]')}><span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold', item.unread ? 'bg-[#efffa8] text-[#536c1e]' : 'bg-slate-100 text-slate-500')}>{isSuperAdmin ? 'SP' : 'LS'}</span><span className="min-w-0 flex-1"><span className={cn('flex items-start justify-between gap-2 text-sm', item.unread ? 'font-semibold text-slate-900' : 'text-slate-700')}><span className="truncate">{item.title}</span><span className="shrink-0 text-[11px] font-normal text-slate-400">{formatRelativeTime(item.time)}</span></span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.body}</span></span></Link></li>)}</ul>}
          </div>

          <div className="border-t border-slate-100 px-4 py-3"><Link to={fullInboxPath} onClick={() => setOpen(false)} className="block text-center text-xs font-semibold text-[#536c1e] hover:text-[#0b0d0c]">View full inbox</Link></div>
        </div>
      ) : null}
    </div>
  );
}
