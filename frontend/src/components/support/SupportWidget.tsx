import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, LifeBuoy, MessageCircle, RefreshCw, WifiOff, X } from 'lucide-react';
import { getRealtimeStatus, leaveSupportChannel, onRealtimeStatusChange, subscribeToSupportChannel } from '../../services/realtime';
import type { RealtimeStatus } from '../../services/realtime';
import { supportService } from '../../services/support.service';
import type { SupportConversation, SupportFaqCategory, SupportMessage, SupportMessagePage } from '../../types/support.types';
import { cn } from '../../utils/cn';
import { useTenant } from '../../hooks/useTenant';
import { classifyMessage, formatDayLabel, isNewDay, mergeMessages } from './formatting';
import MessageBubble from './MessageBubble';
import QuickAnswers from './QuickAnswers';
import SupportComposer from './SupportComposer';

const SUPPORT_RESPONSE_TIME = 'Usually replies within a few hours';

function readSupportMessages(payload: unknown): SupportMessage[] {
  if (Array.isArray(payload)) return payload as SupportMessage[];
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const nested = (payload as { data?: unknown }).data;
    return Array.isArray(nested) ? nested as SupportMessage[] : [];
  }
  return [];
}

function readSupportPage(payload: unknown): SupportMessagePage {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const page = payload as Partial<SupportMessagePage>;
    return {
      data: Array.isArray(page.data) ? page.data as SupportMessage[] : [],
      next_cursor: typeof page.next_cursor === 'string' ? page.next_cursor : null,
      has_more: page.has_more === true,
    };
  }
  return { data: readSupportMessages(payload), next_cursor: null, has_more: false };
}

export default function SupportWidget() {
  const { activeTenant, loading: tenantsLoading, tenants } = useTenant();
  const activeTenantId = activeTenant?.id ?? tenants.find((tenant) => tenant.status === 'active')?.id ?? null;
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [faqs, setFaqs] = useState<SupportFaqCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(getRealtimeStatus());
  const [newMessages, setNewMessages] = useState(false);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const newMessagesRef = useRef(false);
  const prevCountRef = useRef(0);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  const conversationId = conversation?.id ?? null;

  // ------------------------------------------------------------------ data

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const requestedTenantId = activeTenantId;
    if (!requestedTenantId) {
      setInitialError('Select an active organization to view support messages.');
      return null;
    }
    if (!silent) setLoading(true);
    if (!silent) setInitialError('');
    try {
      const [conversationResponse, faqResponse] = await Promise.all([
        supportService.conversation(requestedTenantId),
        supportService.faqs(),
      ]);
      if (activeTenantId !== requestedTenantId) return null;
      const loadedConversation = conversationResponse.data.data;
      setConversation(loadedConversation);
      setFaqs(faqResponse.data.data);
      try {
        const messagesResponse = await supportService.messages(requestedTenantId);
        if (activeTenantId !== requestedTenantId) return null;
        const page = readSupportPage(messagesResponse.data);
        setMessages((current) => mergeMessages(current, page.data));
        setOlderCursor((current) => current ?? page.next_cursor);
        setHasOlderMessages((current) => current || page.has_more);
        setMessageError('');
      } catch {
        setMessageError('Conversation history could not be loaded.');
      }
      return loadedConversation;
    } catch {
      if (!silent) setInitialError('Support chat is temporarily unavailable. Please try again.');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeTenantId]);

  const refreshMessages = useCallback(async () => {
    try {
      const response = await supportService.messages(activeTenantId ?? undefined);
      const page = readSupportPage(response.data);
      setMessages((current) => mergeMessages(current, page.data));
      setOlderCursor((current) => current ?? page.next_cursor);
      setHasOlderMessages((current) => current || page.has_more);
      setMessageError('');
    } catch {
      setMessageError('Conversation history could not be loaded.');
    }
  }, [activeTenantId]);

  const markReadSafe = useCallback(() => {
    void supportService.markRead(activeTenantId ?? undefined).catch(() => undefined);
  }, [activeTenantId]);

  const clearUnreadMessages = useCallback(() => {
    const readAt = new Date().toISOString();
    setMessages((current) => current.map((message) => (
      message.sender_role === 'super_admin' && !message.read_at
        ? { ...message, read_at: readAt }
        : message
    )));
  }, []);

  // --------------------------------------------------------------- lifecycle

  useEffect(() => {
    if (tenantsLoading) return;
    queueMicrotask(() => {
      setConversation(null);
      setMessages([]);
      setOlderCursor(null);
      setHasOlderMessages(false);
      setLoadingOlderMessages(false);
      setInitialError('');
      setMessageError('');
      setNewMessages(false);
      if (openRef.current && activeTenantId) {
        void load();
      }
    });
  }, [activeTenantId, load, tenantsLoading]);

  const openChat = useCallback(() => {
    setOpen(true);
    if (conversation) {
      void refreshMessages().then(() => {
        clearUnreadMessages();
        markReadSafe();
      });
    } else {
      void load().then(() => {
        clearUnreadMessages();
        markReadSafe();
      });
    }
  }, [clearUnreadMessages, conversation, load, markReadSafe, refreshMessages]);

  const closeChat = useCallback(() => {
    clearUnreadMessages();
    markReadSafe();
    setOpen(false);
  }, [clearUnreadMessages, markReadSafe]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setVisible(true));
  }, [open]);

  useEffect(() => {
    if (!open && visible) {
      const timer = window.setTimeout(() => setVisible(false), 180);
      return () => window.clearTimeout(timer);
    }
  }, [open, visible]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    }, 140);
    return () => window.clearTimeout(timer);
  }, [open, conversationId]);

  // ----------------------------------------------------------------- realtime

  useEffect(() => onRealtimeStatusChange(setRealtimeStatus), []);

  useEffect(() => {
    if (!conversationId) return;
    const cleanup = subscribeToSupportChannel(conversationId, (message) => {
      if (message.conversation_id !== conversationId) return;
      setMessages((current) => mergeMessages(current, message));
      setConversation((current) => {
        if (!current) return current;
        return {
          ...current,
          last_message_at: message.created_at,
          status: current.status === 'closed' && message.sender_role === 'super_admin' ? 'open' : current.status,
        };
      });
      if (openRef.current && message.sender_role === 'super_admin') {
        clearUnreadMessages();
        markReadSafe();
      }
    });
    return () => { cleanup?.(); leaveSupportChannel(conversationId); };
  }, [clearUnreadMessages, conversationId, markReadSafe]);

  // Keep a lightweight foreground sync even when Reverb reports online.
  // A WebSocket can be connected while private-channel authorization or
  // subscription has failed. The API remains the reliable source of truth.
  const realtimeOnline = realtimeStatus === 'online';
  useEffect(() => {
    if (!conversationId) return;
    const interval = open ? (realtimeOnline ? 15000 : 5000) : 30000;
    const timer = window.setInterval(() => { void refreshMessages(); }, interval);
    return () => window.clearInterval(timer);
  }, [open, realtimeOnline, conversationId, refreshMessages]);

  // ----------------------------------------------------------------- scrolling

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior });
  }, []);

  const handleThreadScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (atBottomRef.current && newMessagesRef.current) {
      newMessagesRef.current = false;
      setNewMessages(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!olderCursor || loadingOlderMessages || !activeTenantId || !threadRef.current) return;
    const thread = threadRef.current;
    const previousHeight = thread.scrollHeight;
    const previousTop = thread.scrollTop;
    setLoadingOlderMessages(true);
    try {
      const response = await supportService.messages(activeTenantId, { cursor: olderCursor });
      const page = readSupportPage(response.data);
      setMessages((current) => mergeMessages(current, page.data));
      setOlderCursor(page.next_cursor);
      setHasOlderMessages(page.has_more);
      requestAnimationFrame(() => {
        if (threadRef.current) {
          threadRef.current.scrollTop = threadRef.current.scrollHeight - previousHeight + previousTop;
        }
      });
      setMessageError('');
    } catch {
      setMessageError('Older conversation history could not be loaded.');
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [activeTenantId, loadingOlderMessages, olderCursor]);

  useEffect(() => {
    const count = messages.length;
    if (count === 0) {
      prevCountRef.current = 0;
      return;
    }
    const previous = prevCountRef.current;
    prevCountRef.current = count;
    const last = messages[count - 1];

    if (previous === 0) {
      scrollToBottom('auto');
      return;
    }
    if (count > previous) {
      if (classifyMessage(last) === 'customer') {
        newMessagesRef.current = false;
        queueMicrotask(() => setNewMessages(false));
        scrollToBottom();
      } else if (atBottomRef.current) {
        scrollToBottom();
      } else {
        newMessagesRef.current = true;
        setNewMessages(true);
      }
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && conversationId) scrollToBottom('auto');
  }, [open, conversationId, scrollToBottom]);
// ------------------------------------------------------------------- actions

  const chooseFaq = useCallback(async (slug: string) => {
    setOpen(true);
    setSendError(null);
    let activeConversation = conversation;
    if (!activeConversation) {
      activeConversation = await load();
      if (!activeConversation) return;
    }
    try {
      const response = await supportService.faqInteraction(slug, activeTenantId ?? undefined);
      setMessages((current) => mergeMessages(current, response.data.data));
      scrollToBottom();
    } catch {
      setInitialError('Could not load that quick answer. Please try again.');
    }
  }, [activeTenantId, conversation, load, scrollToBottom]);

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || sending) return;
    let activeConversation = conversation;
    if (!activeConversation) {
      activeConversation = await load();
      if (!activeConversation) return;
    }
    setSending(true);
    setSendError(null);
    try {
      const response = await supportService.send(message, activeTenantId ?? undefined);
      setMessages((current) => mergeMessages(current, response.data.data));
      setDraft('');
      scrollToBottom();
    } catch {
      setSendError('Your message could not be sent right now. Try again.');
    } finally {
      setSending(false);
    }
  }, [activeTenantId, conversation, draft, load, scrollToBottom, sending]);

  const reopenConversation = useCallback(async () => {
    setSendError(null);
    try {
      const response = await supportService.status('open', activeTenantId ?? undefined);
      setConversation(response.data.data);
    } catch {
      setSendError('The conversation could not be reopened. Try again.');
    }
  }, [activeTenantId]);

  // ------------------------------------------------------------------ derived

  const unreadCount = useMemo(
    () => messages.filter((message) => message.sender_role === 'super_admin' && !message.read_at).length,
    [messages],
  );

  const hasHandoff = messages.some((message) => classifyMessage(message) === 'handoff');

  const statusDotClass = realtimeStatus === 'online'
    ? 'bg-emerald-400'
    : (realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500');

  const realtimeStatusLabel = realtimeStatus === 'online'
    ? SUPPORT_RESPONSE_TIME
    : (realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting'
      ? 'Connecting to realtime…'
      : `${SUPPORT_RESPONSE_TIME} · API fallback`);
return (
    <>
      {/* Floating launcher */}
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={openChat}
          aria-expanded={false}
          aria-controls="support-chat-panel"
          aria-label={`Open support chat${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          className="support-launcher fixed z-40 flex items-center justify-center rounded-full bg-slate-950 text-left text-white shadow-[0_20px_50px_rgba(15,23,42,0.28)] transition duration-200 hover:bg-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 active:scale-[0.98]"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
            <span className={cn('absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950', statusDotClass)} />
          </span>
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-indigo-700">{unreadCount > 9 ? '9+' : unreadCount}</span>
          ) : null}
        </button>
      ) : null}

      {visible ? (
        <section
          id="support-chat-panel"
          ref={panelRef}
          aria-label="Support chat"
          aria-hidden={!open}
          className={cn(
            'support-chat-panel fixed z-50 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] relative',
            open ? 'support-panel-in' : 'support-panel-out',
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <MessageCircle className="h-5 w-5 text-indigo-300" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">LaunchStack support</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass)} />
                  {conversation?.organization?.name ?? 'Your support team'} · {realtimeStatusLabel}
                </p>
              </div>
            </div>
            <button type="button" onClick={closeChat} aria-label="Close support chat" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
            {!activeTenantId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <MessageCircle className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm text-slate-600">Select an active organization to view support messages.</p>
              </div>
            ) : loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading support chat…</div>
            ) : initialError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-slate-600">{initialError}</p>
                <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
                </button>
              </div>
            ) : (
              <>
                {!conversation || conversation.status !== 'closed' ? (
                  <div className="max-h-52 shrink-0 overflow-y-auto border-b border-slate-100 bg-white px-3 py-3">
                    <QuickAnswers faqs={faqs} onSelect={(slug) => void chooseFaq(slug)} disabled={sending} />
                  </div>
                ) : null}

                <div ref={threadRef} onScroll={handleThreadScroll} className="support-scroll min-h-[180px] min-w-0 flex-1 overflow-y-auto px-2 py-3" role="log" aria-live="polite" aria-label="Conversation messages">
                  {hasOlderMessages ? (
                    <button type="button" onClick={() => void loadOlderMessages()} disabled={loadingOlderMessages} className="mx-auto mb-2 block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60">
                      {loadingOlderMessages ? 'Loading older messages…' : 'Load older messages'}
                    </button>
                  ) : null}
                  {messageError ? (
                    <div className="mx-2 mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <span>{messageError}</span>
                      <button type="button" onClick={() => void refreshMessages()} className="shrink-0 font-semibold underline underline-offset-2">Retry</button>
                    </div>
                  ) : null}
                  {messages.length > 0 ? messages.map((message, index) => (
                    <Fragment key={message.id}>
                      {isNewDay(messages[index - 1]?.created_at, message.created_at) ? (
                        <p className="my-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDayLabel(message.created_at)}</p>
                      ) : null}
                      <MessageBubble message={message} />
                    </Fragment>
                  )) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
                      <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" aria-hidden="true" />
                      <p className="text-sm font-semibold text-slate-700">How can we help?</p>
                      <p className="mt-1 text-xs text-slate-500">Send us a message or choose a quick answer below.</p>
                    </div>
                  )}
                </div>

                {newMessages ? (
                  <button type="button" onClick={() => { newMessagesRef.current = false; setNewMessages(false); scrollToBottom(); }} className="absolute bottom-24 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> New messages
                  </button>
                ) : null}

                {conversation?.status === 'closed' ? (
                  <div className="border-t border-slate-100 bg-white px-4 py-3">
                    <button type="button" onClick={() => void reopenConversation()} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">Reopen conversation</button>
                  </div>
                ) : (
                  <SupportComposer value={draft} onChange={setDraft} onSend={() => void send()} sending={sending} error={sendError ?? undefined} onRetry={() => void send()} hint={hasHandoff ? 'A support specialist will reply as soon as possible.' : SUPPORT_RESPONSE_TIME} />
                )}
                {!realtimeOnline ? <p className="flex items-center justify-center gap-1 bg-slate-50 pb-2 text-[10px] text-slate-400"><WifiOff className="h-3 w-3" aria-hidden="true" /> Messages sync through the API</p> : null}
              </>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
