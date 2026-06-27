import {
  Activity,
  BadgeCheck,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  ReceiptText,
  Rocket,
  Settings,
  UserCircle,
  Users,
  X,
  FlaskConical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
}

const mainNavItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Billing', to: '/dashboard/billing', icon: CreditCard, nested: true },
  {
    label: 'Analytics',
    to: '/dashboard/admin',
    icon: BarChart3,
    matchPaths: ['/dashboard/admin', '/dashboard/admin/analytics'],
    roles: ['admin', 'super_admin'],
  },
  { label: 'Subscriptions', to: '/dashboard/admin/subscriptions', icon: BadgeCheck, nested: true, roles: ['admin', 'super_admin'] },
  { label: 'Payments', to: '/dashboard/admin/payments', icon: ReceiptText, roles: ['admin', 'super_admin'] },
  { label: 'Plans', to: '/dashboard/plans', icon: Package, roles: ['admin', 'super_admin'] },
  { label: 'Users', to: '/dashboard/users', icon: Users, nested: true, roles: ['admin', 'super_admin'] },
  { label: 'Activity Logs', to: '/dashboard/activity-logs', icon: Activity, roles: ['admin', 'super_admin'] },
  { label: 'Contact Messages', to: '/dashboard/contact-messages', icon: Mail, roles: ['admin', 'super_admin'] },
];

const accountNavItems: NavigationItem[] = [
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  { label: 'Profile', to: '/dashboard/profile', icon: UserCircle },
  { label: 'WebMCP Test', to: '/dashboard/webmcp-test', icon: FlaskConical },

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
          'fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-slate-950 transition duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-950/30">
              <Rocket className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold text-white">LaunchPad</span>
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
        <nav className="sidebar-scrollbar flex-1 overflow-y-auto scroll-smooth px-3 py-4" aria-label="Dashboard navigation">
          <div className="space-y-1">
            {mainNavItems
              .filter((item) => !item.roles || item.roles.includes(user?.role ?? 'user'))
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
                      'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50',
                      isActive
                        ? 'bg-white/[0.07] text-white shadow-sm'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400 transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Account</p>
            <div className="space-y-1">
              {accountNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isNavigationItemActive(item, location.pathname);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50',
                      isActive
                        ? 'bg-white/[0.07] text-white shadow-sm'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400 transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-sm font-semibold text-indigo-400">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-200">{user?.name}</p>
                <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-sm font-semibold text-slate-300 transition-all duration-150 hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
