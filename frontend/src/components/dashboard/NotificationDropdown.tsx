import { Bell, CheckCheck, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead, type NotificationItem } from '../../services/notifications.service';
import { cn } from '../../utils/cn';

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getNotificationLink(notification: NotificationItem): string | null {
  if (notification.action_url) return notification.action_url;
  if (notification.type.startsWith('refund') && notification.data?.payment_id) {
    return '/dashboard/billing#payment-history';
  }
  return null;
}

function getNotificationIcon(notification: NotificationItem) {
  if (notification.type.startsWith('refund')) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f7fde7] text-[#536c1e] ring-1 ring-[#d7f36b]">
        <RotateCcw className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f7fde7] text-[#536c1e] ring-1 ring-[#d7f36b]">
      <Bell className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
    </div>
  );
}

interface NotificationDropdownProps {
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

export default function NotificationDropdown({ unreadCount, onUnreadCountChange }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getNotifications(10);
      setNotifications(response.data);
      onUnreadCountChange(response.unread_count);
    } catch {
      setError('Notifications could not be loaded. Try again.');
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  const handleToggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen) {
      void fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError('');
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString(), is_read: true })));
      onUnreadCountChange(0);
    } catch {
      setError('We could not mark all notifications as read. Try again.');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    if (markingId !== null) return;
    setMarkingId(notificationId);
    setError('');
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString(), is_read: true } : n)),
      );
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    } catch {
      setError('We could not update that notification. Try again.');
    } finally {
      setMarkingId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    void getUnreadCount()
      .then((count) => {
        if (mounted) onUnreadCountChange(count);
      })
      .catch(() => {
        // The notification control remains usable if the count request is unavailable.
      });

    return () => { mounted = false; };
  }, [onUnreadCountChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        onClick={handleToggle}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dfe9c4] bg-white/90 text-slate-500 shadow-sm shadow-[#5f7e1a]/10 transition-colors duration-150 hover:border-[#b8d85d] hover:bg-[#f7fde7] hover:text-[#0b0d0c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b8d85d]/35"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-2 w-[22rem] overflow-hidden rounded-xl border border-[#dfe9c4] bg-white shadow-lg shadow-[#5f7e1a]/15 ring-1 ring-[#5f7e1a]/5 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <p className="mt-0.5 text-xs text-slate-500" aria-live="polite">{unreadCount > 0 ? `${unreadCount} need${unreadCount === 1 ? 's' : ''} your attention` : 'Nothing needs your attention'}</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={markingAll}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#536c1e] transition-colors duration-150 hover:bg-[#f7fde7] disabled:cursor-wait disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {markingAll ? 'Saving…' : 'Mark all read'}
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error ? (
              <div className="px-4 py-6 text-center" role="alert">
                <p className="text-sm font-medium text-slate-700">{error}</p>
                <button type="button" onClick={() => void fetchNotifications()} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[#dfe9c4] px-3 text-xs font-semibold text-[#536c1e] transition-colors duration-150 hover:bg-[#f7fde7]">
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-3 px-4 py-4" role="status" aria-label="Loading notifications">
                <Loader2 className="sr-only" aria-hidden="true" />
                {[1, 2, 3].map((item) => <div key={item} className="flex gap-3"><div className="item-skeleton h-8 w-8 shrink-0 rounded-lg" /><div className="min-w-0 flex-1 space-y-2"><div className="item-skeleton h-3 w-2/3 rounded" /><div className="item-skeleton h-3 w-full rounded" /></div></div>)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-600">No notifications</p>
                <p className="mt-0.5 text-xs text-slate-400">You're all caught up!</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const link = getNotificationLink(notification);

                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        'relative flex gap-3 px-4 py-3 transition hover:bg-slate-50',
                        !notification.is_read && 'bg-[#f7fde7]',
                      )}
                    >
                      {getNotificationIcon(notification)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm', notification.is_read ? 'text-slate-700' : 'font-semibold text-slate-900')}>
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-400">{formatTimeAgo(notification.created_at)}</span>
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 line-clamp-2">{notification.message}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400" aria-label={`Category ${notification.category}, severity ${severityLabel(notification.severity)}`}>
                          {notification.category} · {severityLabel(notification.severity)}{notification.mandatory ? ' · Required' : ''}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {link ? (
                            <Link
                              to={link}
                              onClick={() => {
                                if (!notification.is_read) {
                                  void handleMarkRead(notification.id);
                                }
                                setOpen(false);
                              }}
                              className="text-xs font-medium text-[#536c1e] hover:text-[#0b0d0c]"
                            >
                              {getNotificationAction(notification)}
                            </Link>
                          ) : null}
                          {!notification.is_read ? (
                            <button
                              type="button"
                              onClick={() => void handleMarkRead(notification.id)}
                              disabled={markingId !== null}
                              className="min-h-10 text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-slate-600 disabled:cursor-wait disabled:opacity-60"
                            >
                              {markingId === notification.id ? 'Saving…' : 'Mark read'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getNotificationAction(notification: NotificationItem): string {
  if (notification.type.startsWith('refund')) return 'View refund';
  if (notification.type.includes('payment')) return 'Review billing';
  if (notification.type.includes('invitation')) return 'Review invitation';
  if (notification.type.includes('support')) return 'Open support';
  return 'View details';
}

function severityLabel(severity: NotificationItem['severity']): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}
