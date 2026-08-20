import { AlertTriangle, ArrowUpRight, Building2, ChevronDown, LogOut, Menu, Settings, UserCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import NotificationDropdown from './NotificationDropdown';
import { useTenant } from '../../hooks/useTenant';
import TenantCreationForm from './TenantCreationForm';
import { getBillingPlans, getCurrentBilling, type BillingPlan, type CurrentBillingResponse } from '../../services/billing.service';

interface DashboardNavbarProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/admin': 'Analytics',
  '/dashboard/admin/analytics': 'Analytics',
  '/dashboard/admin/subscriptions': 'Subscriptions',
  '/dashboard/admin/payments': 'Payments',
  '/dashboard/billing': 'Billing',
  '/dashboard/billing/checkout': 'Checkout',
  '/dashboard/billing/success': 'Billing',
  '/dashboard/billing/cancel': 'Billing',
  '/dashboard/contact-messages': 'Contact Messages',
  '/dashboard/users': 'Users',
  '/dashboard/profile': 'Profile',
  '/dashboard/settings': 'Settings',
  '/dashboard/organizations': 'Organizations',
  '/dashboard/team': 'Team',
  '/dashboard/activity-logs': 'Activity Logs',
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/dashboard/users/')) {
    return 'User Details';
  }

  if (pathname.startsWith('/dashboard/billing/checkout/')) {
    return 'Checkout';
  }

  return pageTitles[pathname] ?? 'Dashboard';
}

function getRoleLabel(role?: string) {
  switch (role) {
    case 'super_admin':
      return 'Super admin';
    case 'admin':
      return 'Admin';
    default:
      return 'Member';
  }
}

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
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000';
  return `${baseUrl}${url}`;
}

export default function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { tenants, activeTenant, selectTenant } = useTenant();
  const [billing, setBilling] = useState<CurrentBillingResponse | null>(null);
  const [upgradePlans, setUpgradePlans] = useState<BillingPlan[]>([]);
  const [limitTenant, setLimitTenant] = useState<{ name: string; limit: number | string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOpenPath, setCreateOpenPath] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    let mounted = true;
    void Promise.all([getCurrentBilling(), getBillingPlans()])
      .then(([currentBilling, plansResponse]) => {
        if (!mounted) return;
        setBilling(currentBilling);
        setUpgradePlans(plansResponse.data ?? []);
      })
      .catch(() => {
        // Organization switching remains available if billing is temporarily unavailable.
      });
    return () => { mounted = false; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!createOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreateOpen(false);
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [createOpen]);

  // Persistent dashboard navigation must not keep a dialog mounted after routing away.
  useEffect(() => {
    setLimitTenant(null);
    setCreateOpen(false);
  }, [location.pathname]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    navigate('/login', { replace: true });
  };

  const isOverPlanLimit = (tenantId: number): boolean => {
    if (!billing || billing.organization_limit === 'unlimited' || !user) return false;
    const limit = Number(billing.organization_limit);
    if (!Number.isFinite(limit)) return false;

    const ownedOrganizations = tenants
      .filter((tenant) => tenant.owner_id === user.id && tenant.status === 'active')
      .sort((left, right) => String(left.created_at ?? '').localeCompare(String(right.created_at ?? '')));
    const position = ownedOrganizations.findIndex((tenant) => tenant.id === tenantId);
    return position >= limit;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/50 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open sidebar"
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-white/75">LaunchStack</p>
            <h2 className="truncate text-lg font-semibold leading-6 text-white">{pageTitle}</h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <Building2 className="h-4 w-4 text-white" aria-hidden="true" />
            <select
              aria-label="Active organization"
              value={activeTenant?.id ?? ''}
              onChange={(event) => {
                if (event.target.value === 'create') {
                  if (billing && billing.organization_limit !== 'unlimited' && Number(billing.organizations_used) >= Number(billing.organization_limit)) {
                    setLimitTenant({ name: 'a new organization', limit: billing.organization_limit });
                    return;
                  }
                  setCreateOpenPath(location.pathname);
                  setCreateOpen(true);
                  return;
                }
                const tenantId = Number(event.target.value);
                const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);
                if (selectedTenant && isOverPlanLimit(tenantId)) {
                  setLimitTenant({ name: selectedTenant.name, limit: billing?.organization_limit ?? 0 });
                  return;
                }
                selectTenant(tenantId);
              }}
              className="max-w-44 rounded-lg border border-slate-200 bg-white/90 py-2 pl-2.5 pr-8 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} · {tenant.slug}
                </option>
              ))}
              <option value="create">＋ Create organization</option>
            </select>
          </div>
          <NotificationDropdown unreadCount={0} onUnreadCountChange={() => {}} />

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((current) => !current)}
              className="flex min-h-9 max-w-[14rem] items-center gap-2 rounded-lg border border-slate-200 bg-white/90 py-1 pl-1 pr-2.5 text-left shadow-sm shadow-slate-200/50 transition-all duration-150 hover:border-slate-300 hover:bg-white sm:max-w-[20rem]"
            >
              {user?.avatar_url ? (
                <img
                  src={getAvatarUrl(user.avatar_url) ?? ''}
                  alt={user.name}
                  className="h-7 w-7 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.nav-initials-fallback')) {
                      const fallback = document.createElement('span');
                      fallback.className = 'nav-initials-fallback flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-700';
                      fallback.textContent = getInitials(user.name);
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {getInitials(user?.name)}
                </span>
              )}
              <span className="hidden min-w-0 sm:block">
                <span className="flex max-w-44 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{user?.name}</span>
                  <span className="hidden shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100 md:inline-flex">
                    {getRoleLabel(user?.role)}
                  </span>
                </span>
                <span className="block max-w-40 truncate text-xs leading-4 text-slate-500">{user?.email}</span>
              </span>
              <ChevronDown
                className={cn('h-4 w-4 text-slate-400 transition-all duration-150', profileOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            {profileOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  {user?.avatar_url ? (
                    <img
                      src={getAvatarUrl(user.avatar_url) ?? ''}
                      alt={user.name}
                      className="h-10 w-10 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.dropdown-initials')) {
                          const fallback = document.createElement('span');
                          fallback.className = 'dropdown-initials flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-700';
                          fallback.textContent = getInitials(user.name);
                          parent.prepend(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-700">
                      {getInitials(user?.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {getRoleLabel(user?.role)}
                      </span>
                    </div>
                    <p className="truncate text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/dashboard/profile"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <UserCircle className="h-4 w-4" aria-hidden="true" />
                    Profile
                  </Link>
                  <Link
                    to="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Log out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {createOpen && createOpenPath === location.pathname ? (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950/40 px-5 py-8 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateOpen(false);
          }}
        >
          <div
            className="relative max-h-[calc(100vh-4rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-organization-title"
          >
            <div className="mb-5 flex items-start justify-between gap-4 pr-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">New workspace</p>
                <h2 id="create-organization-title" className="mt-1 text-xl font-semibold text-slate-950">Create an organization</h2>
              </div>
              <button
                type="button"
                aria-label="Close organization form"
                onClick={() => setCreateOpen(false)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <TenantCreationForm onCreated={() => setCreateOpen(false)} />
          </div>
        </div>
      ) : null}
      {limitTenant ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 px-5 py-8 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLimitTenant(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="organization-limit-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Plan limit reached</p><h2 id="organization-limit-title" className="mt-1 text-xl font-semibold text-slate-950">Upgrade to open {limitTenant.name}</h2></div></div>
              <button type="button" aria-label="Close organization limit dialog" onClick={() => setLimitTenant(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">This organization is beyond your current allowance of <strong>{limitTenant.limit}</strong> organizations. Upgrade your account plan to access it, or archive an organization you no longer need.</p>
            <div className="mt-5 flex justify-start gap-3">
              {upgradePlans.filter((plan) => {
                if (limitTenant.limit === 'unlimited') return false;
                const currentLimit = Number(limitTenant.limit);
                const planLimit = plan.limits?.organizations;
                return planLimit === 'unlimited' || (Number.isFinite(Number(planLimit)) && Number(planLimit) > currentLimit);
              }).map((plan) => <button key={plan.id} type="button" onClick={() => { setLimitTenant(null); navigate(`/dashboard/billing/checkout/${plan.id}`); }} className="inline-flex min-w-56 items-center justify-between gap-5 rounded-lg bg-[#8200fa] px-4 py-2.5 text-left text-white shadow-sm shadow-[#8200fa]/20 transition hover:bg-[#7000d9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8200fa] focus-visible:ring-offset-2"><span><span className="block text-sm font-semibold">Upgrade to {plan.name}</span><span className="mt-0.5 block text-xs text-white/85">{plan.limits?.organizations === 'unlimited' ? 'Unlimited organizations' : `Up to ${plan.limits?.organizations ?? 0} organizations`}</span></span></button>)}
              {upgradePlans.filter((plan) => plan.limits?.organizations === 'unlimited' || Number(plan.limits?.organizations) > Number(limitTenant.limit)).length === 0 ? <button type="button" onClick={() => { setLimitTenant(null); navigate('/dashboard/billing'); }} className="inline-flex items-center gap-2 rounded-lg bg-[#8200fa] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#8200fa]/20 transition hover:bg-[#7000d9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8200fa] focus-visible:ring-offset-2">Review available plans <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button> : null}
            </div>
            <div className="mt-5 flex justify-center">
              <button type="button" onClick={() => setLimitTenant(null)} className="rounded-lg bg-[#8200fa] px-7 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#8200fa]/20 transition hover:bg-[#7000d9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8200fa] focus-visible:ring-offset-2">Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
