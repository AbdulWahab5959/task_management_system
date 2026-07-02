import type { UserRole, UserStatus } from '../../types/auth.types';
import { cn } from '../../utils/cn';
import { formatRole, formatStatus } from '../../utils/userDisplay';

const roleClasses: Record<UserRole, string> = {
  super_admin: 'border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  admin: 'border-indigo-200 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  user: 'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const statusClasses: Record<UserStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  inactive: 'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-100',
};

function badgeClass(className?: string) {
  return cn('dashboard-badge', className);
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={badgeClass(roleClasses[role])}>{formatRole(role)}</span>;
}

export function UserStatusBadge({ status }: { status?: UserStatus | null }) {
  return (
    <span className={badgeClass(status ? statusClasses[status] : 'border-slate-200 bg-slate-100 text-slate-600 ring-1 ring-slate-200')}>
      {formatStatus(status)}
    </span>
  );
}

export function EmailVerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className={badgeClass(verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100')}>
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}
