import { Activity, ArrowRight, CheckCircle2, KeyRound, Settings, ShieldCheck, UserRound } from 'lucide-react';
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
        eyebrow="Account"
        title={`Welcome back, ${getFirstName(user?.name)}`}
        description="Your LaunchPad workspace is ready for the next product module."
        action={
          <Link
            to="/dashboard/profile"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Email status"
          value={isVerified ? 'Verified' : 'Pending'}
          description={isVerified ? 'Account access is confirmed.' : 'Verification is required.'}
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          tone={isVerified ? 'emerald' : 'amber'}
        />
        <StatsCard
          title="Profile"
          value={user?.name ? 'Ready' : 'Incomplete'}
          description="Name and email are connected."
          icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
          tone="cyan"
        />
        <StatsCard
          title="Security"
          value="Password set"
          description="Current-password checks are enabled."
          icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
          tone="violet"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account status</CardTitle>
            <CardDescription>Core identity details for this user account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Name</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Email</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Member since</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{formatDate(user?.created_at)}</p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>Authentication, email verification, password reset, and protected routes are active.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common account tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/dashboard/profile"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
            >
              Update profile
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/dashboard/profile"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
            >
              Change password
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/dashboard/settings"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
            >
              Open settings
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Account activity will appear here as modules are added.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Activity className="h-5 w-5" aria-hidden="true" />}
              title="No activity yet"
              description="Profile updates and security events will be listed in this timeline."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
