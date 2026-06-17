import { Save, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import Input from '../../components/common/Input';
import PageHeader from '../../components/dashboard/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import type { UpdatePasswordData, UpdateProfileData } from '../../types/auth.types';

type ProfileFieldErrors = Partial<Record<keyof UpdateProfileData, string[]>>;
type PasswordFieldErrors = Partial<Record<keyof UpdatePasswordData, string[]>>;

type ApiError<TFieldErrors> = {
  response?: {
    data?: {
      message?: string;
      errors?: TFieldErrors;
    };
  };
};

function getInitials(name?: string) {
  if (!name) {
    return 'LP';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [profileForm, setProfileForm] = useState<UpdateProfileData>({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });
  const [passwordForm, setPasswordForm] = useState<UpdatePasswordData>({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordFieldErrors>({});
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const isVerified = Boolean(user?.email_verified_at);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileErrors({});
    setProfileError('');
    setProfileMessage('');

    try {
      const response = await authService.updateProfile(profileForm);

      if (response.data.requires_email_verification) {
        await refreshUser();
        navigate('/email-verification-required', { replace: true });
        return;
      }

      setProfileForm({
        name: response.data.user.name,
        email: response.data.user.email,
      });
      await refreshUser();
      setProfileMessage(response.data.message);
    } catch (exception: unknown) {
      const apiError = exception as ApiError<ProfileFieldErrors>;
      setProfileErrors(apiError.response?.data?.errors ?? {});
      setProfileError(apiError.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordErrors({});
    setPasswordError('');
    setPasswordMessage('');

    try {
      const response = await authService.updatePassword(passwordForm);
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      setPasswordMessage(response.data.message);
    } catch (exception: unknown) {
      const apiError = exception as ApiError<PasswordFieldErrors>;
      setPasswordErrors(apiError.response?.data?.errors ?? {});
      setPasswordError(apiError.response?.data?.message || 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your account identity, verification status, and password."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-cyan-100 text-xl font-semibold text-cyan-800">
                {getInitials(user?.name)}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{user?.name}</h2>
              <p className="mt-1 max-w-full truncate text-sm text-slate-500">{user?.email}</p>
              <span className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-semibold ${isVerified ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'}`}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {isVerified ? 'Email verified' : 'Verification required'}
              </span>
            </div>

            <dl className="mt-6 space-y-4 border-t border-slate-100 pt-5">
              <div>
                <dt className="text-sm font-medium text-slate-500">User ID</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">#{user?.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Member since</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950">{formatDate(user?.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile information</CardTitle>
              <CardDescription>Name changes update immediately. Email changes require a fresh verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleProfileSubmit}>
                {profileMessage ? (
                  <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
                    {profileMessage}
                  </div>
                ) : null}
                {profileError ? (
                  <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                    {profileError}
                  </div>
                ) : null}

                <Input
                  label="Name"
                  value={profileForm.name}
                  error={profileErrors.name?.[0]}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileForm.email ?? ''}
                  error={profileErrors.email?.[0]}
                  helperText="Changing your email will pause dashboard access until the new address is verified."
                  onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={savingProfile}
                    icon={<Save className="h-4 w-4" aria-hidden="true" />}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Use your current password before choosing a new one.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                {passwordMessage ? (
                  <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
                    {passwordMessage}
                  </div>
                ) : null}
                {passwordError ? (
                  <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                    {passwordError}
                  </div>
                ) : null}

                <Input
                  label="Current password"
                  type="password"
                  value={passwordForm.current_password}
                  error={passwordErrors.current_password?.[0]}
                  autoComplete="current-password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, current_password: event.target.value }))
                  }
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="New password"
                    type="password"
                    value={passwordForm.password}
                    error={passwordErrors.password?.[0]}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    value={passwordForm.password_confirmation}
                    error={passwordErrors.password_confirmation?.[0]}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={savingPassword}
                    icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                  >
                    Update password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
