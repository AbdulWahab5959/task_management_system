import { BadgeCheck, RefreshCw, Save, UserCog } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import Input from '../../components/common/Input';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { EmailVerificationBadge, RoleBadge, UserStatusBadge } from '../../components/dashboard/UserBadges';
import { useAuth } from '../../hooks/useAuth';
import { adminUsersService } from '../../services/admin-users.service';
import type { AdminUser } from '../../types/admin-user.types';
import type { UserRole, UserStatus } from '../../types/auth.types';
import { formatRole, formatStatus } from '../../utils/userDisplay';

const roleOptions: UserRole[] = ['super_admin', 'admin', 'user'];
const statusOptions: UserStatus[] = ['active', 'inactive'];

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function canManageSensitiveUser(currentUser: AdminUser | null | undefined, target: AdminUser) {
  return currentUser?.role === 'super_admin' || target.role !== 'super_admin';
}

function canChangeOwnField(currentUser: AdminUser | null | undefined, target: AdminUser) {
  return currentUser?.id !== target.id;
}

function getRoleOptionsFor(currentUser: AdminUser | null | undefined) {
  return currentUser?.role === 'super_admin' ? roleOptions : roleOptions.filter((role) => role !== 'super_admin');
}

export default function UserDetailPage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const userId = Number(id);
  const [managedUser, setManagedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canManage = managedUser ? canManageSensitiveUser(currentUser, managedUser) : false;
  const canChangeRole = managedUser ? canManage && canChangeOwnField(currentUser, managedUser) : false;
  const canChangeStatus = managedUser ? canManage && canChangeOwnField(currentUser, managedUser) : false;
  const availableRoleOptions = useMemo(() => getRoleOptionsFor(currentUser), [currentUser]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!Number.isFinite(userId)) {
        setError('Invalid user.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await adminUsersService.get(userId);

        if (isMounted) {
          setManagedUser(response.data);
          setFormData({
            name: response.data.name,
            email: response.data.email,
          });
        }
      } catch {
        if (isMounted) {
          setError('Unable to load this user.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const refreshUser = async () => {
    if (!Number.isFinite(userId)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminUsersService.get(userId);
      setManagedUser(response.data);
      setFormData({
        name: response.data.name,
        email: response.data.email,
      });
    } catch {
      setError('Unable to load this user.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!managedUser) {
      return;
    }

    setSaving(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const response = await adminUsersService.update(managedUser.id, formData);
      setManagedUser(response.data);
      setFormData({
        name: response.data.name,
        email: response.data.email,
      });
      setSuccessMessage('User updated successfully.');
    } catch {
      setActionError('Unable to update this user.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!managedUser || managedUser.role === role) {
      return;
    }

    setRoleLoading(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const response = await adminUsersService.updateRole(managedUser.id, role);
      setManagedUser(response.data);
      setSuccessMessage('Role updated successfully.');
    } catch {
      setActionError('Unable to update user role.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleStatusChange = async (status: UserStatus) => {
    if (!managedUser || managedUser.status === status) {
      return;
    }

    setStatusLoading(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const response = await adminUsersService.updateStatus(managedUser.id, status);
      setManagedUser(response.data);
      setSuccessMessage('Status updated successfully.');
    } catch {
      setActionError('Unable to update user status.');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={managedUser ? managedUser.name : 'User'}
        description="Review identity, access, verification, and account status."
        action={
          <Link
            to="/dashboard/users"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:border-slate-300"
          >
            Back to Users
          </Link>
        }
      />

      {loading ? (
        <Card>
          <CardContent>
            <ProfessionalLoader label="Loading user" detail="Preparing account details" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent>
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refreshUser()}
                icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : managedUser ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <UserCog className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Edit User</CardTitle>
                  <CardDescription>Name and email changes apply to the user account.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {actionError ? (
                <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                  {actionError}
                </div>
              ) : null}
              {successMessage ? (
                <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    {successMessage}
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  required
                  helperText="Changing email marks the account unverified."
                />
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" aria-hidden="true" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                    <UserCog className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle>Access</CardTitle>
                    <CardDescription>Role and account status.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-500">Role</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <RoleBadge role={managedUser.role} />
                    <select
                      value={managedUser.role}
                      disabled={!canChangeRole || roleLoading}
                      onChange={(event) => void handleRoleChange(event.target.value as UserRole)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {availableRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {formatRole(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-500">Status</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <UserStatusBadge status={managedUser.status} />
                    <select
                      value={managedUser.status ?? 'active'}
                      disabled={!canChangeStatus || statusLoading}
                      onChange={(event) => void handleStatusChange(event.target.value as UserStatus)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatStatus(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>Verification and timestamps.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-500">Email verification</p>
                  <EmailVerificationBadge verified={Boolean(managedUser.email_verified_at)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Joined</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(managedUser.created_at)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Updated</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(managedUser.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={<UserCog className="h-6 w-6" aria-hidden="true" />}
              title="User not found"
              description="The requested user could not be loaded."
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
