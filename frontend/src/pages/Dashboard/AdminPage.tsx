import { useEffect, useState } from 'react';
import { Activity, BarChart3, Inbox, MailCheck, MessageSquareReply, Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';
import StatsCard from '../../components/dashboard/StatsCard';
import EmptyState from '../../components/dashboard/EmptyState';
import { adminAnalyticsService } from '../../services/admin-analytics.service';
import type { AdminAnalyticsResponse } from '../../types/admin-analytics.types';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRole(role: string): string {
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminPage() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const response = await adminAnalyticsService.get();
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Analytics" description="Loading platform analytics..." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Analytics" description="Platform analytics overview." />
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <BarChart3 className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-slate-900">Failed to load analytics</p>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // Empty state
  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Analytics" description="Platform analytics overview." />
        <Card>
          <CardContent>
            <div className="py-12">
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="No analytics data available"
                description="Data will appear here once the platform has activity."
              />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const { stats, recent_users, recent_activity, contact_summary } = data;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Analytics"
        description="Real-time platform analytics from your database."
      />

      {/* Stats Cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={String(stats.total_users)}
          icon={<Users className="h-6 w-6" />}
          variant="indigo"
        />
        <StatsCard
          title="Verified Users"
          value={String(stats.verified_users)}
          icon={<UserCheck className="h-6 w-6" />}
          variant="emerald"
        />
        <StatsCard
          title="Unverified Users"
          value={String(stats.unverified_users)}
          icon={<UserX className="h-6 w-6" />}
          variant="amber"
        />
        <StatsCard
          title="New Users (Month)"
          value={String(stats.new_users_this_month)}
          icon={<UserPlus className="h-6 w-6" />}
          variant="cyan"
        />
        <StatsCard
          title="Contact Messages"
          value={String(stats.contact_messages_total)}
          icon={<Inbox className="h-6 w-6" />}
          variant="indigo"
        />
        <StatsCard
          title="New Messages"
          value={String(stats.new_contact_messages)}
          icon={<MailCheck className="h-6 w-6" />}
          variant="cyan"
        />
        <StatsCard
          title="Activity Log Entries"
          value={String(stats.activity_logs_count)}
          icon={<Activity className="h-6 w-6" />}
          variant="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Recent Users</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recent_users.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="No users registered yet"
                />
              </div>
            ) : (
              <>
                <div className="dashboard-table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Verified</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recent_users.map((user) => (
                        <tr key={user.id} className="transition-colors duration-150 hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                          <td className="px-6 py-4 text-slate-600">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="dashboard-badge border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                              {formatRole(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.email_verified_at ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <UserCheck className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Yes</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <UserX className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">No</span>
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {formatDate(user.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Recent Activity</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recent_activity.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={<Activity className="h-6 w-6" />}
                  title="No activity logged yet"
                />
              </div>
            ) : (
              <>
                <div className="dashboard-table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                        <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recent_activity.map((log) => (
                        <tr key={log.id} className="transition-colors duration-150 hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p className="truncate font-medium text-slate-900">{log.action}</p>
                              {log.description && (
                                <p className="truncate text-xs text-slate-500">{log.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {log.user ? (
                              <span className="truncate">{log.user.name}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {formatDate(log.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Summary */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <StatsCard
          title="New Messages"
          value={String(contact_summary.new)}
          icon={<MailCheck className="h-6 w-6" />}
          variant="cyan"
        />
        <StatsCard
          title="Read Messages"
          value={String(contact_summary.read)}
          icon={<Inbox className="h-6 w-6" />}
          variant="emerald"
        />
        <StatsCard
          title="Replied Messages"
          value={String(contact_summary.replied)}
          icon={<MessageSquareReply className="h-6 w-6" />}
          variant="indigo"
        />
      </div>
    </>
  );
}
