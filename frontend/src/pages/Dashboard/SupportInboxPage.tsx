import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Inbox, RefreshCw, Search, WifiOff } from 'lucide-react';
import Button from '../../components/common/Button';
import PageHeader from '../../components/dashboard/PageHeader';
import MessageBubble from '../../components/support/MessageBubble';
import SupportComposer from '../../components/support/SupportComposer';
import { formatDayLabel, formatRelativeTime, getInitials, isNewDay, mergeMessages } from '../../components/support/formatting';
import { getRealtimeStatus, onRealtimeStatusChange, subscribeToSupportChannel } from '../../services/realtime';
import type { RealtimeStatus } from '../../services/realtime';
import { adminSupportService } from '../../services/support.service';
import type { SupportConversation, SupportMessage, SupportStatus } from '../../types/support.types';
import { cn } from '../../utils/cn';

const statusFilters: Array<'all' | SupportStatus> = ['all', 'open', 'pending', 'closed'];

const statusPillClass: Record<SupportStatus, string> = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  closed: 'bg-slate-100 text-slate-500 ring-slate-500/10',
};

const statusDotClass: Record<SupportStatus, string> = {
  open: 'bg-emerald-500',
  pending: 'bg-amber-500',
  closed: 'bg-slate-300',
};

export default function SupportInboxPage() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [status, setStatus] = useState<'all' | SupportStatus>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(getRealtimeStatus());

  const selectedIdRef = useRef(selectedId);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const conversationKey = useMemo(
    () => conversations.map((item) => item.id).join(','),
    [conversations],
  );

  // ------------------------------------------------------------------ list

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const response = await adminSupportService.list({
        status: status === 'all' ? undefined : status,
        search: appliedSearch || undefined,
      });
      setConversations(response.data.data.data);
    } catch {
      setListError('Could not load support conversations.');
    } finally {
      setLoadingList(false);
    }
  }, [status, appliedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    queueMicrotask(() => { void loadList(); });
  }, [loadList]);

  const realtimeOnline = realtimeStatus === 'online';
  useEffect(() => {
    if (realtimeOnline) return;
    const timer = window.setInterval(() => { void loadList(); }, 30000);
    return () => window.clearInterval(timer);
  }, [realtimeOnline, loadList]);

  // ------------------------------------------------------------------ thread

  const openConversation = useCallback(async (conversation: SupportConversation) => {
    setSelectedId(conversation.id);
    setThreadError('');
    setSendError(null);
    setMobileThreadOpen(true);
    setLoadingThread(true);
    try {
      const response = await adminSupportService.messages(conversation.id);
      setMessages(response.data.data);
      await adminSupportService.markRead(conversation.id).catch(() => undefined);
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unread_count: 0 } : item));
    } catch {
      setThreadError('Could not load this conversation.');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const closeThread = useCallback(() => {
    setSelectedId(null);
    setMessages([]);
    setMobileThreadOpen(false);
  }, []);

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!selectedId || !message || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const response = await adminSupportService.send(selectedId, message);
      setMessages((current) => mergeMessages(current, response.data.data));
      setDraft('');
      await loadList();
    } catch {
      setSendError('Reply could not be sent. Try again.');
    } finally {
      setSending(false);
    }
  }, [draft, loadList, selectedId, sending]);

  const updateStatus = useCallback(async (next: SupportStatus) => {
    if (!selectedId) return;
    setChangingStatus(true);
    setSendError(null);
    try {
      const response = await adminSupportService.status(selectedId, next);
      setConversations((current) => current.map((item) => item.id === selectedId
        ? { ...response.data.data, unread_count: item.unread_count }
        : item));
    } catch {
      setSendError('Conversation status could not be updated.');
    } finally {
      setChangingStatus(false);
    }
  }, [selectedId]);

  // ----------------------------------------------------------------- realtime

  useEffect(() => onRealtimeStatusChange(setRealtimeStatus), []);

  useEffect(() => {
    if (!conversationKey) return;
    const cleanups: Array<() => void> = [];

    conversations.forEach((conversation) => {
      const cleanup = subscribeToSupportChannel(conversation.id, (message) => {
        if (message.conversation_id !== conversation.id) return;
        const isSelected = selectedIdRef.current === message.conversation_id;
        const fromCustomer = message.sender_role !== 'super_admin';

        setConversations((current) => current.map((item) => {
          if (item.id !== message.conversation_id) return item;
          return {
            ...item,
            latest_message: message,
            last_message_at: message.created_at,
            status: fromCustomer ? 'pending' : 'open',
            unread_count: isSelected ? 0 : (item.unread_count ?? 0) + 1,
          };
        }));

        if (isSelected) {
          setMessages((current) => mergeMessages(current, message));
          if (fromCustomer) {
            void adminSupportService.markRead(conversation.id).catch(() => undefined);
          }
        } else if (fromCustomer && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('New LaunchStack support message', {
              body: `${conversation.user?.name ?? 'A customer'} is waiting for a reply.`,
            });
          } catch {
            // Notification failures must never break the inbox.
          }
        }
      });

      if (cleanup) cleanups.push(cleanup);
    });

    return () => { cleanups.forEach((cleanup) => cleanup()); };
    // Subscriptions follow the visible conversation ids; selected state is
    // read through a ref so it does not need to re-trigger subscriptions.
  }, [conversationKey, conversations]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = window.setTimeout(() => { void Notification.requestPermission().catch(() => undefined); }, 1500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Customer support inbox"
        description="Reply to customers, keep conversations moving, and close resolved requests."
        action={<Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadList()}>Refresh</Button>}
      />

      {realtimeStatus !== 'online' ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {realtimeStatus === 'offline' || realtimeStatus === 'unavailable'
            ? 'Realtime is unavailable — the inbox refreshes automatically through the API.'
            : 'Reconnecting to realtime… the inbox keeps syncing through the API.'}
        </p>
      ) : null}

      {listError ? (
        <p className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <span>{listError}</span>
          <button
            type="button"
            onClick={() => void loadList()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800 transition hover:bg-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />Try again
          </button>
        </p>
      ) : null}

      <div className="support-inbox-layout grid items-start gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.55fr)]">
        {/* Conversation list */}
        <div className={cn('min-h-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm', mobileThreadOpen && 'hidden lg:block')}>
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="dashboard-control w-full pl-9"
                placeholder="Search customers or organizations"
                aria-label="Search support conversations"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter conversations by status">
              {statusFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={status === item}
                  onClick={() => setStatus(item)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-bold capitalize transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    status === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            {loadingList ? (
              <div className="space-y-2 p-3" aria-label="Loading conversations">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="item-skeleton h-20 rounded-xl" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Inbox className="h-9 w-9 text-slate-200" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-700">No conversations found</p>
                <p className="mt-1 text-xs text-slate-500">Customer messages will appear here as they arrive.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {conversations.map((conversation) => {
                  const isActive = selectedId === conversation.id;
                  const unread = conversation.unread_count ?? 0;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => void openConversation(conversation)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500',
                          isActive ? 'bg-indigo-50/70' : 'hover:bg-slate-50',
                        )}
                      >
                        <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200/60">
                          {getInitials(conversation.user?.name)}
                          <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white', statusDotClass[conversation.status])} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn('truncate text-sm', unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800')}>
                              {conversation.user?.name ?? 'Unknown customer'}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(conversation.last_message_at)}</span>
                          </span>
                          <span className="block truncate text-xs text-slate-500">{conversation.organization?.name ?? 'Unknown organization'}</span>
                          <span className="mt-1 flex items-center justify-between gap-2">
                            <span className={cn('truncate text-xs', unread ? 'font-semibold text-slate-700' : 'text-slate-500')}>
                              {conversation.latest_message?.message ?? 'No messages yet'}
                            </span>
                            {unread ? (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Thread pane */}
        <div className={cn('min-h-[560px] min-h-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm', !mobileThreadOpen && 'hidden lg:block')}>
          {selected ? (
            <div className="flex h-full min-h-[560px] min-h-0 flex-col overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={closeThread}
                    aria-label="Back to conversation list"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200/60">
                    {getInitials(selected.user?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{selected.user?.name ?? 'Unknown customer'}</p>
                    <p className="truncate text-xs text-slate-500">{selected.user?.email ?? 'No email on file'}</p>
                    <p className="truncate text-xs text-slate-400">{selected.organization?.name ?? 'Unknown organization'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1', statusPillClass[selected.status])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass[selected.status])} />
                    {selected.status}
                  </span>
                  {selected.status === 'closed' ? (
                    <Button size="sm" isLoading={changingStatus} onClick={() => void updateStatus('open')}>Reopen</Button>
                  ) : (
                    <Button size="sm" variant="secondary" isLoading={changingStatus} onClick={() => void updateStatus('closed')}>Close</Button>
                  )}
                </div>
              </header>

              {threadError ? (
                <p className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
                  <span>{threadError}</span>
                  <button
                    type="button"
                    onClick={() => selected && void openConversation(selected)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800 transition hover:bg-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />Try again
                  </button>
                </p>
              ) : null}

              <div className="support-scroll flex-1 space-y-1 overflow-y-auto bg-slate-50/60 px-4 py-4" style={{ maxHeight: 'calc(100dvh - 280px)' }}>
                {loadingThread ? (
                  <div className="space-y-3" aria-label="Loading messages">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className={cn('item-skeleton h-12 w-1/2 rounded-2xl', item % 2 === 1 && 'ml-auto')} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Inbox className="h-9 w-9 text-slate-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-slate-700">No messages yet</p>
                    <p className="mt-1 text-xs text-slate-500">Send a first reply to get the conversation started.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <Fragment key={message.id}>
                        {isNewDay(messages[index - 1]?.created_at, message.created_at) ? (
                          <div className="flex justify-center py-2">
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                              {formatDayLabel(message.created_at)}
                            </span>
                          </div>
                        ) : null}
                        <MessageBubble message={message} viewer="support_admin" showSenderLabel showReadIndicator />
                      </Fragment>
                    ))}
                  </>
                )}
              </div>

              {selected.status === 'closed' ? (
                <div className="border-t border-slate-100 bg-white px-4 py-3 text-center">
                  <p className="text-xs font-medium text-slate-500">This conversation is closed. Reopen it to reply.</p>
                </div>
              ) : (
                <SupportComposer
                  value={draft}
                  onChange={(value) => { setDraft(value); if (sendError) setSendError(null); }}
                  onSend={() => void send()}
                  sending={sending}
                  error={sendError ?? undefined}
                  onRetry={() => void send()}
                  hint="Press Enter to send, Shift+Enter for a new line."
                />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[560px] flex-col items-center justify-center p-8 text-center">
              <Inbox className="h-9 w-9 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-slate-700">Select a conversation</p>
              <p className="mt-1 text-sm text-slate-500">Customer messages and replies will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
