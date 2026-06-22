import type { UserRole, UserStatus } from '../../types/auth.types';
import { cn } from '../../utils/cn';
import { formatRole, formatStatus } from '../../utils/userDisplay';

const roleClasses: Record<UserRole, string> = {
  super_admin: 'bg-violet-50 text-violet-700 ring-violet-100',
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  user: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const statusClasses: Record<UserStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  inactive: 'bg-rose-50 text-rose-700 ring-rose-100',
};

function badgeClass(className?: string) {
  return cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', className);
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={badgeClass(roleClasses[role])}>{formatRole(role)}</span>;
}

export function UserStatusBadge({ status }: { status?: UserStatus | null }) {
  return (
    <span className={badgeClass(status ? statusClasses[status] : 'bg-slate-100 text-slate-600 ring-slate-200')}>
      {formatStatus(status)}
    </span>
  );
}

export function EmailVerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className={badgeClass(verified ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100')}>
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}
