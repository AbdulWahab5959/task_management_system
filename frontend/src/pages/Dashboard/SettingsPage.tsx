import { Bell, Lock, Mail, Shield, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';

interface ToggleRowProps {
  title: string;
  description: string;
  checked?: boolean;
}

function ToggleRow({ checked = false, description, title }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3.5 transition-all duration-150 hover:border-slate-300">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
        role="switch"
        aria-checked={checked}
        aria-hidden="true"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
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
        description="Manage your account, notification, and security preferences."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <UserCog className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>Profile and access preferences.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow title="Profile Visibility" description="Personal account details stay private." checked />
            <ToggleRow title="Product Updates" description="Receive account-level release notes." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Email and account alerts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow title="Security Emails" description="Critical account notices are enabled." checked />
            <ToggleRow title="Digest Emails" description="Weekly summaries can be enabled later." />
            <ToggleRow title="Marketing Emails" description="Optional product announcements." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Password and session controls.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow title="Email Verification" description="Verified email is required for dashboard access." checked />
            <ToggleRow title="Password Changes" description="Current password confirmation is required." checked />
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-slate-600">
              <Lock className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <span>Additional sign-in controls can be connected here.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Channel-specific preferences are ready for future modules.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow title="Email Channel" description="Used for verification and password recovery." checked />
              <ToggleRow title="In-App Channel" description="Dashboard alerts can be enabled later." />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}