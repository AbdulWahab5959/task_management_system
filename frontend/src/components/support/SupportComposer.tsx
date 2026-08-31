import { AlertCircle, Loader2, RotateCcw, SendHorizonal } from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '../../types/support.types';
import { cn } from '../../utils/cn';

interface SupportComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  onRetry?: () => void;
  hint?: string;
  autoFocus?: boolean;
}

export default function SupportComposer({
  value,
  onChange,
  onSend,
  sending = false,
  disabled = false,
  placeholder = 'Write a message…',
  error,
  onRetry,
  hint,
  autoFocus = false,
}: SupportComposerProps) {
  const trimmed = value.trim();
  const overLimit = value.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !overLimit && !sending && !disabled;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSend) onSend();
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white px-3 pb-3 pt-2.5" aria-label="Support message composer">
      <div
        className={cn(
          'rounded-2xl border bg-white transition duration-150',
          overLimit
            ? 'border-rose-300 ring-4 ring-rose-500/10'
            : 'border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10',
        )}
      >
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={2}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={overLimit || Boolean(error)}
          className="min-h-12 w-full resize-none bg-transparent px-3.5 py-2.5 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <span className={cn('text-[11px] tabular-nums', overLimit ? 'font-semibold text-rose-600' : 'text-slate-400')}>
            {overLimit
              ? `${value.length - MAX_MESSAGE_LENGTH} characters over the limit`
              : `${value.length}/${MAX_MESSAGE_LENGTH}`}
          </span>
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
              canSend
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500 active:scale-[0.98]'
                : 'cursor-not-allowed bg-slate-100 text-slate-400',
            )}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <SendHorizonal className="h-3.5 w-3.5" aria-hidden="true" />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      {hint && !error && !overLimit ? (
        <p className="mt-1.5 px-2 text-[11px] text-slate-400">{hint}</p>
      ) : null}

      {error ? (
        <p className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700" role="alert">
          <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800 transition hover:bg-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />Try again
            </button>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}