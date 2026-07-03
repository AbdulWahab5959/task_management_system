import { Bell, CheckCheck, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markAllAsRead, markAsRead, type NotificationItem } from '../../services/notifications.service';
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
  if (notification.type.startsWith('refund') && notification.data?.payment_id) {
    return '/dashboard/billing#payment-history';
  }
  return null;
}

function getNotificationIcon(notification: NotificationItem) {
  if (notification.type.startsWith('refund')) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100">
        <RotateCcw className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications(10);
      setNotifications(response.data);
      onUnreadCountChange(response.unread_count);
    } catch {
      // Silently fail
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
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString(), is_read: true })));
      onUnreadCountChange(0);
    } catch {
      // Silently fail
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString(), is_read: true } : n)),
      );
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    } catch {
      // Silently fail
    }
  };

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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-500 shadow-sm shadow-slate-200/50 transition-all duration-150 hover:border-slate-300 hover:bg-white hover:text-slate-900"
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
          className="absolute right-0 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
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
                        !notification.is_read && 'bg-indigo-50/40',
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
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              View details
                            </Link>
                          ) : null}
                          {!notification.is_read ? (
                            <button
                              type="button"
                              onClick={() => void handleMarkRead(notification.id)}
                              className="text-xs font-medium text-slate-400 hover:text-slate-600"
                            >
                              Mark read
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