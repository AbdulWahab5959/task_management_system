import {
  BadgeCheck,
  Bell,
  CheckCircle2,
  Globe2,
  KeyRound,
  Lock,
  MonitorCog,
  Shield,
  Smartphone,
  UserCog,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/dashboard/PageHeader';
import { userSettingsService } from '../../services/user-settings.service';
import { authService } from '../../services/auth.service';
import type {
  UserNotificationPreferences,
  UserPreferences,
  UserSettings,
} from '../../types/user-settings.types';

const timezones = [
  'UTC',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
];

const locales = ['en'];

type FlatSettings = Pick<
  UserNotificationPreferences,
  'email_notifications_enabled' | 'billing_notifications_enabled' | 'team_notifications_enabled' | 'security_notifications_enabled' | 'marketing_emails_enabled'
> &
  UserPreferences;

type ApiErrors = Partial<Record<keyof FlatSettings, string[]>>;

function emptySettings(): FlatSettings {
  return {
    email_notifications_enabled: true,
    billing_notifications_enabled: true,
    team_notifications_enabled: true,
    security_notifications_enabled: true,
    marketing_emails_enabled: false,
    timezone: 'UTC',
    locale: 'en',
  };
}

function errorDetails(exception: unknown): { message: string; fields: ApiErrors } {
  const response = (exception as { response?: { data?: { message?: string; errors?: ApiErrors } } }).response;
  return {
    message: response?.data?.message ?? 'Unable to save your account settings.',
    fields: response?.data?.errors ?? {},
  };
}

interface ToggleProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ id, checked, disabled = false, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50 disabled:cursor-not-allowed ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

interface ToggleRowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ id, title, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-slate-900">
          {title}
        </label>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <Toggle id={id} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-5 text-slate-600">
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default function UserSettingsPage() {
  const [form, setForm] = useState<FlatSettings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ApiErrors>({});
  const [savedMessage, setSavedMessage] = useState('');
  const [securityStatus, setSecurityStatus] = useState<string>('coming_soon');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setLoadError('');
      setSecurityStatus('coming_soon');
      try {
        const settings: UserSettings = await userSettingsService.get();
        if (!mounted) return;
        setForm({
          email_notifications_enabled: settings.notifications.email_notifications_enabled ?? settings.notifications.email_enabled,
          billing_notifications_enabled: settings.notifications.billing_notifications_enabled ?? settings.notifications.billing_enabled,
          team_notifications_enabled: settings.notifications.team_notifications_enabled ?? settings.notifications.team_enabled,
          security_notifications_enabled: settings.notifications.security_notifications_enabled ?? settings.notifications.security_enabled,
          marketing_emails_enabled: settings.notifications.marketing_emails_enabled ?? settings.notifications.marketing_enabled,
          timezone: settings.preferences.timezone || 'UTC',
          locale: settings.preferences.locale || 'en',
        });
        setSecurityStatus(settings.security.two_factor_status);
      } catch {
        if (mounted) setLoadError('Unable to load your account settings.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const setField = <K extends keyof FlatSettings>(key: K, value: FlatSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: [] }));
    setSavedMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSavedMessage('');
    setFieldErrors({});

    try {
      await userSettingsService.update({
        email_notifications_enabled: form.email_notifications_enabled,
        billing_notifications_enabled: form.billing_notifications_enabled,
        team_notifications_enabled: form.team_notifications_enabled,
        security_notifications_enabled: form.security_notifications_enabled,
        marketing_emails_enabled: form.marketing_emails_enabled,
        timezone: form.timezone,
        locale: form.locale,
      });
      setSavedMessage('Account settings saved.');
    } catch (exception: unknown) {
      const details = errorDetails(exception);
      setSaveError(details.message);
      setFieldErrors(details.fields);
    } finally {
      setSaving(false);
    }
  };

  const startTwoFactorSetup = async () => {
    setTwoFactorBusy(true); setTwoFactorError('');
    try { const response = await authService.twoFactorSetup(twoFactorPassword); setTwoFactorSecret(response.data.secret); setSecurityStatus('setup'); }
    catch { setTwoFactorError('We could not start setup. Check your password and try again.'); }
    finally { setTwoFactorBusy(false); }
  };

  const confirmTwoFactor = async () => {
    setTwoFactorBusy(true); setTwoFactorError('');
    try { const response = await authService.twoFactorConfirm(twoFactorCode); setRecoveryCodes(response.data.recovery_codes); setSecurityStatus('enabled'); setTwoFactorSecret(''); setTwoFactorCode(''); setTwoFactorPassword(''); }
    catch { setTwoFactorError('That authenticator code is invalid or expired.'); }
    finally { setTwoFactorBusy(false); }
  };

  const disableTwoFactor = async () => {
    setTwoFactorBusy(true); setTwoFactorError('');
    try { await authService.twoFactorDisable(twoFactorPassword, twoFactorCode); setSecurityStatus('disabled'); setTwoFactorPassword(''); setTwoFactorCode(''); }
    catch { setTwoFactorError('The password or authentication code is invalid.'); }
    finally { setTwoFactorBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Account"
        title="Account settings"
        description="Personal notification preferences and security controls for your LaunchStack account."
      />

      {loading ? (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center">
            <LoadingSpinner label="Loading your account settings" />
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-rose-700">{loadError}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form className="space-y-6" onSubmit={submit}>
          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Choose which account notifications reach you.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                id="email_notifications_enabled"
                title="Email notifications"
                description="General account activity delivered by email."
                checked={form.email_notifications_enabled}
                onChange={(value) => setField('email_notifications_enabled', value)}
              />
              <ToggleRow
                id="team_notifications_enabled"
                title="Team notifications"
                description="Invitations, membership, and team activity."
                checked={form.team_notifications_enabled}
                onChange={(value) => setField('team_notifications_enabled', value)}
              />
              <ToggleRow
                id="marketing_emails_enabled"
                title="Product & marketing emails"
                description="News, product updates, and promotional messages."
                checked={form.marketing_emails_enabled}
                onChange={(value) => setField('marketing_emails_enabled', value)}
              />

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Always on</p>
                <div className="mt-3 space-y-3">
                  <ToggleRow
                    id="billing_notifications_enabled"
                    title="Billing notifications"
                    description="Payment and subscription alerts are required for account safety."
                    checked={form.billing_notifications_enabled}
                    disabled
                    onChange={() => undefined}
                  />
                  <ToggleRow
                    id="security_notifications_enabled"
                    title="Security notifications"
                    description="Sign-in and security alerts are required for account safety."
                    checked={form.security_notifications_enabled}
                    disabled
                    onChange={() => undefined}
                  />
                  <InfoNote>Critical billing and security alerts cannot be disabled.</InfoNote>
                </div>
              </div>
            </CardContent>
          </Card>

{/* Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  <Globe2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Personal formatting and regional defaults.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="timezone">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => setField('timezone', event.target.value)}
                  className="dashboard-control"
                >
                  {timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
                {fieldErrors.timezone?.[0] ? (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.timezone[0]}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="locale">
                  Language
                </label>
                <select
                  id="locale"
                  value={form.locale}
                  onChange={(event) => setField('locale', event.target.value)}
                  className="dashboard-control"
                >
                  {locales.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale === 'en' ? 'English' : locale}
                    </option>
                  ))}
                </select>
                {fieldErrors.locale?.[0] ? (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.locale[0]}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Shield className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Sign-in and account protection controls.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Password</p>
                    <p className="text-xs text-slate-500">Update your current password.</p>
                  </div>
                </div>
                <Link
                  to="/dashboard/profile"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserCog className="h-4 w-4" aria-hidden="true" />
                  Manage
                </Link>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Two-factor authentication</p>
                    <p className="text-xs text-slate-500">
                      {securityStatus === 'coming_soon'
                        ? 'Two-factor authentication is coming soon.'
                        : securityStatus === 'enabled'
                          ? 'Two-factor authentication is enabled.'
                          : 'Two-factor authentication is available.'}
                    </p>
                  </div>
                </div>
                {securityStatus === 'enabled' ? <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Enabled</span> : null}
                <div className="mt-4 space-y-3">
                  {securityStatus !== 'enabled' && !twoFactorSecret ? <><input type="password" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} placeholder="Confirm your password" className="dashboard-control" /><Button type="button" size="sm" isLoading={twoFactorBusy} onClick={() => void startTwoFactorSetup()}>Set up authenticator</Button></> : null}
                  {twoFactorSecret ? <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-sm"><p>Enter this secret in your authenticator app:</p><code className="block break-all font-mono text-xs text-slate-700">{twoFactorSecret}</code><input inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} placeholder="6-digit code" className="dashboard-control" /><Button type="button" size="sm" isLoading={twoFactorBusy} onClick={() => void confirmTwoFactor()}>Confirm and enable</Button></div> : null}
                  {securityStatus === 'enabled' ? <><div className="grid gap-3 sm:grid-cols-2"><input type="password" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} placeholder="Password" className="dashboard-control" /><input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} placeholder="Authenticator or recovery code" className="dashboard-control" /></div><Button type="button" size="sm" variant="danger" isLoading={twoFactorBusy} onClick={() => void disableTwoFactor()}>Disable 2FA</Button></> : null}
                  {recoveryCodes.length > 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Save these recovery codes somewhere safe. Each works once.</p><code className="mt-2 block whitespace-pre-wrap font-mono">{recoveryCodes.join('\n')}</code></div> : null}
                  {twoFactorError ? <p className="text-xs font-medium text-rose-600" role="alert">{twoFactorError}</p> : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <MonitorCog className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Sessions</p>
                    <p className="text-xs text-slate-500">
                      Sign out of the current device from the sidebar anytime. Device-level session
                      management is not yet available.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Current only
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Save row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-6 text-sm">
              {savedMessage ? (
                <span className="inline-flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {savedMessage}
                </span>
              ) : null}
              {saveError ? <span className="text-rose-600">{saveError}</span> : null}
              {fieldErrors.email_notifications_enabled?.[0] || fieldErrors.billing_notifications_enabled?.[0] || fieldErrors.team_notifications_enabled?.[0] || fieldErrors.security_notifications_enabled?.[0] || fieldErrors.marketing_emails_enabled?.[0] ? (
                <span className="text-rose-600">Some notification preferences could not be saved.</span>
              ) : null}
            </div>
            <Button type="submit" isLoading={saving} icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}>
              Save changes
            </Button>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            These are personal account settings. They do not change your organization&apos;s workspace settings.
          </p>
        </form>
      )}
    </div>
  );
}
