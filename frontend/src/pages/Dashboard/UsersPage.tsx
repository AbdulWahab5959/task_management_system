import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { EmailVerificationBadge, RoleBadge, UserStatusBadge } from '../../components/dashboard/UserBadges';
import { useAuth } from '../../hooks/useAuth';
import { adminUsersService } from '../../services/admin-users.service';
import type { AdminUser, EmailVerificationFilter, PaginatedAdminUsers } from '../../types/admin-user.types';
import type { UserRole, UserStatus } from '../../types/auth.types';
import { formatRole, formatStatus } from '../../utils/userDisplay';

const roleOptions: UserRole[] = ['super_admin', 'admin', 'user'];
const statusOptions: UserStatus[] = ['active', 'inactive'];

function getInitialPagination(): PaginatedAdminUsers {
  return {
    data: [],
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: 10,
    to: null,
    total: 0,
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Never';
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

export default function UsersPage() {
  const { user } = useAuth();
  const [pagination, setPagination] = useState<PaginatedAdminUsers>(getInitialPagination);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [verifiedFilter, setVerifiedFilter] = useState<EmailVerificationFilter | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [roleLoadingId, setRoleLoadingId] = useState<number | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);

  const users = pagination.data;
  const hasUsers = users.length > 0;

  const listParams = useMemo(
    () => ({
      page,
      per_page: 10,
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      verified: verifiedFilter || undefined,
    }),
    [page, roleFilter, search, statusFilter, verifiedFilter],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminUsersService.list(listParams);
      setPagination(response.data);
    } catch {
      setError('Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await adminUsersService.list(listParams);

        if (isMounted) {
          setPagination(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load users.');
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
  }, [listParams]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setVerifiedFilter('');
    setPage(1);
  };

  const handleRoleChange = async (targetUser: AdminUser, role: UserRole) => {
    if (targetUser.role === role) {
      return;
    }

    setRoleLoadingId(targetUser.id);
    setActionError('');

    try {
      const response = await adminUsersService.updateRole(targetUser.id, role);
      const updatedUser = response.data;

      setPagination((current) => ({
        ...current,
        data: current.data.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
      }));
    } catch {
      setActionError('Unable to update user role.');
    } finally {
      setRoleLoadingId(null);
    }
  };

  const handleStatusChange = async (targetUser: AdminUser, status: UserStatus) => {
    if (targetUser.status === status) {
      return;
    }

    setStatusLoadingId(targetUser.id);
    setActionError('');

    try {
      const response = await adminUsersService.updateStatus(targetUser.id, status);
      const updatedUser = response.data;

      setPagination((current) => ({
        ...current,
        data: current.data.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
      }));
    } catch {
      setActionError('Unable to update user status.');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter || verifiedFilter);
  const availableRoleOptions = getRoleOptionsFor(user);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Search users, review access, and manage account roles and status."
      />

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_160px_160px_180px_auto] xl:items-end">
            <Input
              label="Search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="role-filter">
                Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value as UserRole | '');
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="status-filter">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as UserStatus | '');
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="verified-filter">
                Email
              </label>
              <select
                id="verified-filter"
                value={verifiedFilter}
                onChange={(event) => {
                  setVerifiedFilter(event.target.value as EmailVerificationFilter | '');
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">All emails</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" icon={<Search className="h-4 w-4" aria-hidden="true" />}>
                Search
              </Button>
              {hasActiveFilters ? (
                <Button type="button" variant="secondary" onClick={handleClearFilters}>
                  Clear
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadUsers()}
                icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                Refresh
              </Button>
            </div>
          </form>
        </CardHeader>

        <CardContent className="p-0">
          {actionError ? (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
              {actionError}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoadingSpinner label="Loading users" />
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <Button type="button" variant="secondary" onClick={() => void loadUsers()}>
                Try again
              </Button>
            </div>
          ) : hasUsers ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        User
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Joined
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((targetUser) => {
                      const canManage = canManageSensitiveUser(user, targetUser);
                      const canChangeRole = canManage && canChangeOwnField(user, targetUser);
                      const canChangeStatus = canManage && canChangeOwnField(user, targetUser);

                      return (
                        <tr key={targetUser.id} className="align-top">
                          <td className="px-5 py-4">
                            <p className="max-w-48 truncate text-sm font-semibold text-slate-950">{targetUser.name}</p>
                            <p className="max-w-56 truncate text-sm text-slate-500">{targetUser.email}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-2">
                              <RoleBadge role={targetUser.role} />
                              <select
                                value={targetUser.role}
                                disabled={!canChangeRole || roleLoadingId === targetUser.id}
                                onChange={(event) =>
                                  void handleRoleChange(targetUser, event.target.value as UserRole)
                                }
                                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                              >
                                {availableRoleOptions.map((role) => (
                                  <option key={role} value={role}>
                                    {formatRole(role)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-2">
                              <UserStatusBadge status={targetUser.status} />
                              <select
                                value={targetUser.status ?? 'active'}
                                disabled={!canChangeStatus || statusLoadingId === targetUser.id}
                                onChange={(event) =>
                                  void handleStatusChange(targetUser, event.target.value as UserStatus)
                                }
                                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {formatStatus(status)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <EmailVerificationBadge verified={Boolean(targetUser.email_verified_at)} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(targetUser.created_at)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <Link
                                to={`/dashboard/users/${targetUser.id}`}
                                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {pagination.from} to {pagination.to} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => current + 1)}
                    icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-10">
              <EmptyState
                icon={<Users className="h-5 w-5" aria-hidden="true" />}
                title={hasActiveFilters ? 'No matching users' : 'No users found'}
                description={hasActiveFilters ? 'Try another search or filter combination.' : 'Registered users will appear here.'}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
