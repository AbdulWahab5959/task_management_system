import { BadgeCheck, Camera, Lock, Save, Shield, UserCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import Input from '../../components/common/Input';
import PageHeader from '../../components/dashboard/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import type { UpdatePasswordData, UpdateProfileData } from '../../types/auth.types';
import { cn } from '../../utils/cn';

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

// ----- avatar helpers (shared) -----
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

function getAvatarUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  // If it's already a full URL (OAuth), use as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Otherwise prepend backend base URL
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000';
  return `${baseUrl}${url}`;
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

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const isVerified = Boolean(user?.email_verified_at);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Client-side validation
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Allowed image types: jpg, jpeg, png, webp.');
      setAvatarMessage('');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must not exceed 2MB in size.');
      setAvatarMessage('');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setAvatarError('');
    setAvatarMessage('');

    // Auto-submit
    void handleAvatarUpload(file);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    setAvatarError('');
    setAvatarMessage('');

    try {
      const response = await authService.updateAvatar(file);
      setAvatarMessage(response.data.message);
      await refreshUser();
    } catch (exception: unknown) {
      const apiError = exception as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errorMsg = apiError.response?.data?.errors?.avatar?.[0]
        ?? apiError.response?.data?.message
        ?? 'Failed to upload avatar.';
      setAvatarError(errorMsg);
      // Reset preview on error
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

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
        {/* Profile Summary Card with Avatar Upload */}
        <Card>
          <CardContent className="px-6 py-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative">
                {avatarError ? (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-100 text-2xl font-bold text-rose-600 shadow-lg">
                    {getInitials(user?.name)}
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Avatar preview"
                    className="h-20 w-20 rounded-2xl object-cover shadow-lg shadow-indigo-500/25"
                  />
                ) : user?.avatar_url ? (
                  <img
                    src={getAvatarUrl(user.avatar_url) ?? ''}
                    alt={user.name}
                    className="h-20 w-20 rounded-2xl object-cover shadow-lg shadow-indigo-500/25"
                    onError={(e) => {
                      // Fallback to initials on image load error
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.initials-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'initials-fallback flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/25';
                        fallback.textContent = getInitials(user.name);
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/25">
                    {getInitials(user?.name)}
                  </div>
                )}

                {/* Upload button overlay */}
                <label
                  htmlFor="avatar-upload"
                  className={cn(
                    'absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition-colors hover:bg-slate-700',
                    uploading && 'pointer-events-none opacity-50'
                  )}
                >
                  {uploading ? (
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  )}
                </label>
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900">{user?.name}</h2>
              <p className="mt-1 max-w-full truncate text-sm text-slate-500">{user?.email}</p>

              {/* Avatar status messages */}
              {avatarMessage ? (
                <p className="mt-3 text-xs font-medium text-emerald-600">{avatarMessage}</p>
              ) : null}
              {avatarError ? (
                <p className="mt-3 text-xs font-medium text-rose-600">{avatarError}</p>
              ) : null}

              <span
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isVerified
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {isVerified ? 'Email Verified' : 'Verification Required'}
              </span>
            </div>

            <dl className="mt-6 space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-slate-500">User ID</dt>
                <dd className="text-sm font-semibold text-slate-900">#{user?.id}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-slate-500">Member Since</dt>
                <dd className="text-sm font-semibold text-slate-900">{formatDate(user?.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <UserCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Name changes update immediately. Email changes require verification.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleProfileSubmit}>
                {profileMessage ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                      {profileMessage}
                    </div>
                  </div>
                ) : null}
                {profileError ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    {profileError}
                  </div>
                ) : null}

                <Input
                  label="Full Name"
                  value={profileForm.name}
                  error={profileErrors.name?.[0]}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileForm.email ?? ''}
                  error={profileErrors.email?.[0]}
                  helperText="Changing your email will pause dashboard access until the new address is verified."
                  onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                />

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <Button
                    type="submit"
                    isLoading={savingProfile}
                    icon={<Save className="h-4 w-4" aria-hidden="true" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Use your current password before choosing a new one.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                {passwordMessage ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                      {passwordMessage}
                    </div>
                  </div>
                ) : null}
                {passwordError ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    {passwordError}
                  </div>
                ) : null}

                <Input
                  label="Current Password"
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
                    label="New Password"
                    type="password"
                    value={passwordForm.password}
                    error={passwordErrors.password?.[0]}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.password_confirmation}
                    error={passwordErrors.password_confirmation?.[0]}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))
                    }
                  />
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <Button
                    type="submit"
                    isLoading={savingPassword}
                    icon={<Shield className="h-4 w-4" aria-hidden="true" />}
                  >
                    Update Password
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