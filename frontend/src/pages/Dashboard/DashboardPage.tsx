import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Settings,
  Shield,
  UserCircle,
  UserPlus,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDashboardActivity } from '../../services/dashboard-activity.service';
import type { ActivityLog } from '../../types/activity-log.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const activityLabels: Record<string, string> = {
  register: 'Registered',
  login: 'Logged in',
  logout: 'Logged out',
  profile_update: 'Profile updated',
  password_update: 'Password changed',
  avatar_update: 'Avatar updated',
  contact_form_submit: 'Contact form submitted',
  subscription_created: 'Subscription created',
  subscription_cancelled_immediately: 'Subscription cancelled',
  payment_successful: 'Payment successful',
};

const activityIconStyles: Record<string, string> = {
  register: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  login: 'bg-sky-50 text-sky-600 ring-sky-100',
  logout: 'bg-slate-100 text-slate-600 ring-slate-200',
  profile_update: 'bg-violet-50 text-violet-600 ring-violet-100',
  password_update: 'bg-amber-50 text-amber-600 ring-amber-100',
  avatar_update: 'bg-violet-50 text-violet-600 ring-violet-100',
  contact_form_submit: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  subscription_created: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  subscription_cancelled_immediately: 'bg-rose-50 text-rose-600 ring-rose-100',
  payment_successful: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
};

function getFirstName(name?: string) {
  return name?.split(' ').filter(Boolean)[0] ?? 'there';
}

function formatDate(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatActionLabel(action: string): string {
  return activityLabels[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActivityIcon(action: string) {
  const iconMap: Record<string, typeof BadgeCheck> = {
    register: UserPlus,
    login: LogIn,
    logout: LogOut,
    profile_update: UserCircle,
    password_update: Shield,
    avatar_update: UserCircle,
    contact_form_submit: Mail,
    subscription_created: BadgeCheck,
    subscription_cancelled_immediately: BadgeCheck,
    payment_successful: BadgeCheck,
  };

  const Icon = iconMap[action] ?? Activity;
  return Icon;
}

function getActivityIconStyle(action: string): string {
  return activityIconStyles[action] ?? 'bg-indigo-50 text-indigo-600 ring-indigo-100';
}

function getDisplayEmail(log: ActivityLog): string | null {
  if (log.contact_email) {
    return log.contact_email;
  }

  if (log.user?.email) {
    return log.user.email;
  }

  if (log.properties && typeof log.properties === 'object') {
    const email = log.properties.email;
    if (typeof email === 'string') {
      return email;
    }
  }

  return null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isVerified = Boolean(user?.email_verified_at);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const response = await getDashboardActivity();
      setActivityLogs(response.data);
    } catch {
      setActivityError('Unable to load your recent activity.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setActivityLoading(true);
      setActivityError('');
      try {
        const response = await getDashboardActivity();
        if (isMounted) {
          setActivityLogs(response.data);
        }
      } catch {
        if (isMounted) {
          setActivityError('Unable to load your recent activity.');
        }
      } finally {
        if (isMounted) {
          setActivityLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${getFirstName(user?.name)}`}
        description="Your LaunchStack workspace overview and quick actions."
        action={
          <Link
            to="/dashboard/profile"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:border-slate-300"
          >
            <UserCircle className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        <StatsCard
          title="Email Status"
          value={isVerified ? 'Verified' : 'Pending'}
          description={isVerified ? 'Account access is confirmed.' : 'Verification is required.'}
          icon={<BadgeCheck className="h-6 w-6" aria-hidden="true" />}
          variant={isVerified ? 'emerald' : 'amber'}
        />
        <StatsCard
          title="Profile"
          value={user?.name ? 'Complete' : 'Incomplete'}
          description="Name and email are connected."
          icon={<UserCircle className="h-6 w-6" aria-hidden="true" />}
          variant="indigo"
        />
        <StatsCard
          title="Security"
          value="Active"
          description="Password and session protection."
          icon={<Shield className="h-6 w-6" aria-hidden="true" />}
          variant="violet"
        />
      </div>

      {/* Main Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Account Status</CardTitle>
                <CardDescription>Core identity details for your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Name</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.email}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Member Since</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(user?.created_at)}</p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>Authentication, email verification, password reset, and protected routes are active and secure.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common account tasks.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/dashboard/profile"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Update profile
            </Link>
            <Link
              to="/dashboard/profile"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Change password
            </Link>
            <Link
              to="/dashboard/settings"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Open settings
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest account activity.</CardDescription>
                </div>
              </div>
              {activityError ? (
                <button
                  type="button"
                  onClick={() => void loadActivity()}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <LoadingSpinner label="Loading recent activity" />
              </div>
            ) : activityError ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-6 py-8 text-center">
                <Activity className="h-6 w-6 text-amber-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Unable to load activity</p>
                  <p className="mt-0.5 text-xs text-amber-700">{activityError}</p>
                </div>
              </div>
            ) : activityLogs.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-6 w-6" aria-hidden="true" />}
                title="No activity yet"
                description="Logins, profile updates, and security events will be listed in this timeline."
              />
            ) : (
              <div className="space-y-1">
                {activityLogs.map((log, index) => {
                  const Icon = getActivityIcon(log.action);
                  const isLast = index === activityLogs.length - 1;
                  const email = getDisplayEmail(log);

                  return (
                    <div key={log.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {!isLast ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-slate-200"
                        />
                      ) : null}
                      <div
                        className={cn(
                          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1',
                          getActivityIconStyle(log.action),
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {formatActionLabel(log.action)}
                            </p>
                            {email ? (
                              <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>
                            ) : null}
                          </div>
                          <time className="shrink-0 text-xs font-medium text-slate-400 sm:pl-3">
                            {formatDate(log.created_at)}
                          </time>
                        </div>
                        {log.description ? (
                          <p className="mt-1 text-xs leading-5 text-slate-500">{log.description}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
