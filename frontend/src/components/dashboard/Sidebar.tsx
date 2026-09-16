import {
  Activity,
  BadgeCheck,
  Building2,
  BarChart3,
  CreditCard,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  ReceiptText,
  Rocket,
  Settings,
  UserCircle,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import type { UserRole } from '../../types/auth.types';
import { cn } from '../../utils/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  matchPaths?: string[];
  nested?: boolean;
  roles?: UserRole[];
  permissions?: string[];
}

const mainNavItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Organizations', to: '/dashboard/organizations', icon: Building2 },
  { label: 'Projects', to: '/dashboard/projects', icon: FolderKanban, nested: true },
  { label: 'My Tasks', to: '/dashboard/tasks', icon: CheckSquare },
  { label: 'Analytics', to: '/dashboard/analytics', icon: BarChart3, permissions: ['analytics.view'], roles: ['user', 'admin'] },
  { label: 'Support', to: '/dashboard/support-center', icon: MessageCircle, permissions: ['support.view'], roles: ['user', 'admin'] },
  { label: 'Billing', to: '/dashboard/billing', icon: CreditCard, nested: true, roles: ['user', 'admin'] },
  {
    label: 'Analytics',
    to: '/dashboard/admin',
    icon: BarChart3,
    matchPaths: ['/dashboard/admin', '/dashboard/admin/analytics'],
    roles: ['super_admin'],
  },
  { label: 'Subscriptions', to: '/dashboard/admin/subscriptions', icon: BadgeCheck, nested: true, roles: ['super_admin'] },
  { label: 'Payments', to: '/dashboard/admin/payments', icon: ReceiptText, roles: ['super_admin'] },
  { label: 'Plans', to: '/dashboard/plans', icon: Package, roles: ['super_admin'] },
  { label: 'Users', to: '/dashboard/users', icon: Users, nested: true, roles: ['super_admin'] },
  { label: 'Activity Logs', to: '/dashboard/activity-logs', icon: Activity, roles: ['super_admin'] },
  { label: 'Contact Messages', to: '/dashboard/contact-messages', icon: Mail, roles: ['super_admin'] },
  { label: 'Support Inbox', to: '/dashboard/support', icon: MessageCircle, roles: ['super_admin'] },
];

const accountNavItems: NavigationItem[] = [
  { label: 'Team', to: '/dashboard/team', icon: Users },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  { label: 'Personal settings', to: '/dashboard/settings/account', icon: UserCog },

  { label: 'Profile', to: '/dashboard/profile', icon: UserCircle },

];

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

function isNavigationItemActive(item: NavigationItem, pathname: string) {
  if (item.matchPaths?.includes(pathname)) {
    return true;
  }

  if (item.end) {
    return pathname === item.to;
  }

  if (item.nested) {
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }

  return pathname === item.to;
}

function getRoleLabel(role?: UserRole) {
  switch (role) {
    case 'super_admin':
      return 'Super admin';
    case 'admin':
      return 'Admin';
    default:
      return 'Member';
  }
}

export default function Sidebar({ onClose, open }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { activeTenant } = useTenant();
  const tenantPermissions = activeTenant?.permissions ?? [];
  const canSeeNavigationItem = (item: NavigationItem) => !item.permissions || item.permissions.every((permission) => tenantPermissions.includes(permission));

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#080d1d] transition duration-200 ease-out lg:z-30 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-950/30">
              <Rocket className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold text-white">LaunchStack</span>
              <span className="block text-xs font-medium text-slate-400">Workspace</span>
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-scrollbar flex-1 overflow-y-auto scroll-smooth px-2.5 py-3" aria-label="Dashboard navigation">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
          <div className="space-y-1">
            {mainNavItems
              .filter((item) => (!item.roles || item.roles.includes(user?.role ?? 'user')) && canSeeNavigationItem(item))
              .map((item) => {
                const Icon = item.icon;
                const isActive = isNavigationItemActive(item, location.pathname);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50',
                      isActive
                        ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cyan-300 transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Account</p>
            <div className="space-y-1">
              {accountNavItems
                .filter((item) => (!item.roles || item.roles.includes(user?.role ?? 'user')) && canSeeNavigationItem(item))
                .map((item) => {
                const Icon = item.icon;
                const isActive = isNavigationItemActive(item, location.pathname);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50',
                      isActive
                        ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cyan-300 transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-3 flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/20">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-200">{user?.name}</p>
                <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-300 transition-all duration-150 hover:border-slate-600 hover:bg-white/[0.08] hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
