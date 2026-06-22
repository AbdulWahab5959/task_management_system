import { Activity, BarChart3, LayoutDashboard, LogOut, Mail, Rocket, Settings, UserCircle, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
  roles?: UserRole[];
}

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Analytics', to: '/dashboard/admin', icon: BarChart3, roles: ['admin', 'super_admin'] },
  { label: 'Users', to: '/dashboard/users', icon: Users, roles: ['admin', 'super_admin'] },
  { label: 'Activity Logs', to: '/dashboard/activity-logs', icon: Activity, roles: ['admin', 'super_admin'] },
  { label: 'Contact Messages', to: '/dashboard/contact-messages', icon: Mail, roles: ['admin', 'super_admin'] },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
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

export default function Sidebar({ onClose, open }: SidebarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const visibleNavigationItems = navigationItems.filter((item) => !item.roles || item.roles.includes(user?.role ?? 'user'));

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
          'fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-slate-900 transition duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
              <Rocket className="h-5 w-5" aria-hidden="true" />
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-sm font-semibold text-indigo-400">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">{user?.name}</p>
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