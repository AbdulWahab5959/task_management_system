import { Activity, BadgeCheck, LayoutDashboard, Settings, Shield, UserCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../hooks/useAuth';

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
  }).format(new Date(value));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isVerified = Boolean(user?.email_verified_at);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${getFirstName(user?.name)}`}
        description="Your LaunchPad workspace overview and quick actions."
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Account activity will appear here as modules are added.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Activity className="h-6 w-6" aria-hidden="true" />}
              title="No activity yet"
              description="Profile updates and security events will be listed in this timeline."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
