import { ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { adminActivityLogsService } from '../../services/admin-activity-logs.service';
import type { PaginatedActivityLogs } from '../../types/activity-log.types';
import { cn } from '../../utils/cn';

const actionLabels: Record<string, string> = {
  register: 'Register',
  login: 'Login',
  logout: 'Logout',
  profile_update: 'Profile Update',
  password_update: 'Password Update',
  contact_form_submit: 'Contact Form Submit',
  admin_user_update: 'Admin User Update',
  contact_message_status_update: 'Contact Message Status Update',
};

function formatAction(action: string): string {
  return actionLabels[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const actionBadgeColors: Record<string, string> = {
  register: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  login: 'bg-blue-50 text-blue-700 ring-blue-100',
  logout: 'bg-slate-100 text-slate-700 ring-slate-200',
  profile_update: 'bg-violet-50 text-violet-700 ring-violet-100',
  password_update: 'bg-amber-50 text-amber-700 ring-amber-100',
  contact_form_submit: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  admin_user_update: 'bg-rose-50 text-rose-700 ring-rose-100',
  contact_message_status_update: 'bg-orange-50 text-orange-700 ring-orange-100',
};

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        actionBadgeColors[action] ?? 'bg-slate-50 text-slate-700 ring-slate-200',
      )}
    >
      {formatAction(action)}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getInitialPagination(): PaginatedActivityLogs {
  return {
    data: [],
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: 10,
    to: null,
    total: 0,
  };
}

export default function ActivityLogsPage() {
  const [pagination, setPagination] = useState<PaginatedActivityLogs>(getInitialPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  const logs = pagination.data;
  const hasLogs = logs.length > 0;

  const listParams = useMemo(
    () => ({
      page,
      per_page: 10,
      action: actionFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [page, actionFilter, dateFrom, dateTo],
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminActivityLogsService.list(listParams);
      setPagination(response.data);
    } catch {
      setError('Unable to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [logsResponse, actionsResponse] = await Promise.all([
          adminActivityLogsService.list(listParams),
          adminActivityLogsService.actions(),
        ]);

        if (isMounted) {
          setPagination(logsResponse.data);
          setAvailableActions(actionsResponse.data);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load activity logs.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [listParams]);

  const handleClearFilters = () => {
    setActionFilter('');
    setUserSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = actionFilter || userSearch || dateFrom || dateTo;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Activity logs"
        description="Track important user and admin actions across the system."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl lg:grid-cols-4">
              <div>
                <label htmlFor="action-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </label>
                <select
                  id="action-filter"
                  value={actionFilter}
                  onChange={(event) => {
                    setActionFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="">All actions</option>
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {formatAction(action)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date-from" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div>
                <label htmlFor="date-to" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex items-end gap-2">
                {hasActiveFilters ? (
                  <Button type="button" variant="secondary" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadLogs()}
                  icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoadingSpinner label="Loading activity logs" />
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <Button type="button" variant="secondary" onClick={() => void loadLogs()}>
                Try again
              </Button>
            </div>
          ) : hasLogs ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        User
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {logs.map((log) => (
                      <tr key={log.id} className="align-top">
                        <td className="px-5 py-4">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-5 py-4">
                          {log.user ? (
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{log.user.name}</p>
                              <p className="text-sm text-slate-500">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="max-w-xs px-5 py-4">
                          <p className="truncate text-sm text-slate-700">{log.description ?? '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {pagination.from} to {pagination.to} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => current + 1)}
                    icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-10">
              <EmptyState
                icon={<History className="h-5 w-5" aria-hidden="true" />}
                title={hasActiveFilters ? 'No matching logs' : 'No activity logs'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'Activity logs will appear here as users interact with the system.'
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}