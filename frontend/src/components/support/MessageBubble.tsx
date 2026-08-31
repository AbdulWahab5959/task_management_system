import { Check, CheckCheck, MessageSquareText, Sparkles, UserRound } from 'lucide-react';
import type { SupportMessage, SupportMessageKind } from '../../types/support.types';
import { classifyMessage, formatMessageTime, getInitials } from './formatting';
import { cn } from '../../utils/cn';

const kindLabel: Record<SupportMessageKind, string> = {
  customer: 'You',
  support: 'LaunchStack support',
  faq: 'Quick answer',
  handoff: 'Talk to support',
};

interface MessageBubbleProps {
  message: SupportMessage;
  /** 'customer' renders the message from the customer's perspective. */
  viewer?: 'customer' | 'support_admin';
  showSenderLabel?: boolean;
  showReadIndicator?: boolean;
  compact?: boolean;
}

export default function MessageBubble({ message, viewer = 'customer', showSenderLabel = false, showReadIndicator = false, compact = false }: MessageBubbleProps) {
  const kind = classifyMessage(message);
  const time = formatMessageTime(message.created_at);
  const isRead = Boolean(message.read_at);

  if (kind === 'faq' || kind === 'handoff') {
    const [question, ...answerParts] = message.message.split('\n\n');
    const answer = answerParts.join('\n\n');

    return (
      <div className="flex animate-[support-message-in_180ms_ease-out] flex-col items-center px-2 py-1.5" role="listitem">
        <div className={cn(
          'w-full max-w-[92%] rounded-xl border p-3.5 text-sm leading-relaxed',
          kind === 'faq'
            ? 'border-slate-200 bg-slate-50/90 text-slate-700'
            : 'border-amber-200/80 bg-amber-50/80 text-amber-950',
        )}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {kind === 'handoff' ? <MessageSquareText className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
            {kindLabel[kind]}
          </p>
          {question ? <p className="font-semibold text-slate-900">{question.replace(/^Question:\s*/, '')}</p> : null}
          {answer ? <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{answer.replace(/^Answer:\s*/, '')}</p> : null}
          {!question && !answer ? <p className="whitespace-pre-wrap break-words text-slate-600">{message.message}</p> : null}
          {!compact ? <time className="mt-1.5 block text-right text-[10px] text-slate-400">{time}</time> : null}
        </div>
      </div>
    );
  }

  const isCustomerMessage = kind === 'customer';
  const alignRight = isCustomerMessage === (viewer === 'customer');

  return (
    <div className="flex animate-[support-message-in_180ms_ease-out] items-end gap-2 px-2 py-1.5" role="listitem">
      {!alignRight ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200/60" aria-hidden="true">
          {kind === 'support' ? <UserRound className="h-3.5 w-3.5" /> : getInitials(message.sender?.name)}
        </span>
      ) : null}
      <div className={cn('flex max-w-[78%] flex-col', alignRight ? 'items-end' : 'items-start')}>
        {showSenderLabel ? (
          <span className={cn('mb-1 px-1 text-[11px] font-semibold text-slate-500', alignRight ? 'text-right' : 'text-left')}>
            {viewer === 'customer' ? kindLabel[kind] : (isCustomerMessage ? (message.sender?.name ?? 'Customer') : 'You')}
          </span>
        ) : null}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-colors',
            alignRight
              ? 'rounded-br-md bg-indigo-600 text-white'
              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.message}</p>
          <span className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', alignRight ? 'text-indigo-100/90' : 'text-slate-400')}>
            <span>{time}</span>
            {showReadIndicator && isCustomerMessage && viewer === 'support_admin' ? (
              isRead ? <CheckCheck className="h-3 w-3" aria-label="Read" /> : <Check className="h-3 w-3" aria-label="Sent" />
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}
