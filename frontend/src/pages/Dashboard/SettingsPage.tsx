import { Bell, LockKeyhole, Mail, ShieldCheck, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';

interface ToggleRowProps {
  title: string;
  description: string;
  checked?: boolean;
}

function ToggleRow({ checked = false, description, title }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-cyan-600' : 'bg-slate-200'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Account preferences are organized here for future LaunchPad modules."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                <UserCog className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>Profile and access preferences.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow title="Profile visibility" description="Personal account details stay private." checked />
            <ToggleRow title="Product updates" description="Receive account-level release notes." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Email and account alerts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow title="Security emails" description="Critical account notices are enabled." checked />
            <ToggleRow title="Digest emails" description="Weekly summaries can be enabled later." />
            <ToggleRow title="Marketing emails" description="Optional product announcements." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Password and session controls.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow title="Email verification" description="Verified email is required for dashboard access." checked />
            <ToggleRow title="Password changes" description="Current password confirmation is required." checked />
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <LockKeyhole className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <span>Additional sign-in controls can be connected here.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Notification channels</CardTitle>
                <CardDescription>Channel-specific preferences are ready for future modules.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow title="Email channel" description="Used for verification and password recovery." checked />
              <ToggleRow title="In-app channel" description="Dashboard alerts can be enabled later." />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
