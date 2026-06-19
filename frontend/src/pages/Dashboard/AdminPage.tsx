import { useEffect, useState } from 'react';
import { Activity, Inbox, MailCheck, MessageSquareReply, Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';
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

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  default: 'bg-slate-50 text-slate-600 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ${variantStyles[variant]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-950">{value}</p>
          <p className="truncate text-sm text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Activity className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-red-700">Failed to load analytics</p>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Activity className="h-12 w-12 text-slate-300" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">No analytics data available</p>
              <p className="text-sm text-slate-500">Data will appear here once the platform has activity.</p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const { stats, recent_users, recent_activity, contact_summary } = data;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Analytics" description="Real-time platform analytics from your database." />

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats.total_users}
          icon={<Users className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          label="Verified Users"
          value={stats.verified_users}
          icon={<UserCheck className="h-6 w-6" />}
          variant="success"
        />
        <StatCard
          label="Unverified Users"
          value={stats.unverified_users}
          icon={<UserX className="h-6 w-6" />}
          variant="warning"
        />
        <StatCard
          label="New Users This Month"
          value={stats.new_users_this_month}
          icon={<UserPlus className="h-6 w-6" />}
          variant="info"
        />
        <StatCard
          label="Contact Messages"
          value={stats.contact_messages_total}
          icon={<Inbox className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          label="New Messages"
          value={stats.new_contact_messages}
          icon={<MailCheck className="h-6 w-6" />}
          variant="info"
        />
        <StatCard
          label="Activity Log Entries"
          value={stats.activity_logs_count}
          icon={<Activity className="h-6 w-6" />}
          variant="default"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent_users.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <Users className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm text-slate-500">No users registered yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 font-medium text-slate-500">Name</th>
                      <th className="px-5 py-3 font-medium text-slate-500">Email</th>
                      <th className="px-5 py-3 font-medium text-slate-500">Role</th>
                      <th className="px-5 py-3 font-medium text-slate-500">Verified</th>
                      <th className="px-5 py-3 font-medium text-slate-500">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recent_users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-950">{user.name}</td>
                        <td className="px-5 py-3 text-slate-600">{user.email}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {user.email_verified_at ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <UserCheck className="h-3.5 w-3.5" />
                              <span className="text-xs">Yes</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <UserX className="h-3.5 w-3.5" />
                              <span className="text-xs">No</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent_activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <Activity className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm text-slate-500">No activity logged yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 font-medium text-slate-500">Action</th>
                      <th className="px-5 py-3 font-medium text-slate-500">User</th>
                      <th className="px-5 py-3 font-medium text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recent_activity.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="max-w-xs">
                            <p className="truncate font-medium text-slate-950">{log.action}</p>
                            {log.description && (
                              <p className="truncate text-xs text-slate-500">{log.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {log.user ? (
                            <span className="truncate">{log.user.name}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Summary */}
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200">
              <MailCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-950">{contact_summary.new}</p>
              <p className="text-sm text-slate-500">New Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-950">{contact_summary.read}</p>
              <p className="text-sm text-slate-500">Read Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
              <MessageSquareReply className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-950">{contact_summary.replied}</p>
              <p className="text-sm text-slate-500">Replied Messages</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}