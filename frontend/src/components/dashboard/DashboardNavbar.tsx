import { AlertTriangle, Building2, Check, ChevronDown, LogOut, Menu, Search, Settings, UserCircle, X } from 'lucide-react';
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
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? 'http://localhost:8000';
  return `${baseUrl}${url}`;
}

export default function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { tenants, activeTenant, selectTenant } = useTenant();
  const isSuperAdmin = user?.role === 'super_admin';
  const [billing, setBilling] = useState<CurrentBillingResponse | null>(null);
  const [upgradePlans, setUpgradePlans] = useState<BillingPlan[]>([]);
  const [limitTenant, setLimitTenant] = useState<{ name: string; limit: number | string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createOpenPath, setCreateOpenPath] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const organizationDropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    if (isSuperAdmin) {
      return;
    }

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
  }, [isSuperAdmin]);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (organizationDropdownRef.current && !organizationDropdownRef.current.contains(event.target as Node)) {
        setOrganizationOpen(false);
      }
    };

    if (organizationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [organizationOpen]);

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
    queueMicrotask(() => {
      setLimitTenant(null);
      setCreateOpen(false);
    });
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

  const filteredOrganizations = tenants.filter((tenant) => {
    const query = organizationSearch.trim().toLowerCase();
    return !query || tenant.name.toLowerCase().includes(query) || tenant.slug.toLowerCase().includes(query);
  });

  const selectOrganization = (tenantId: number) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);
    if (!selectedTenant) return;
    if (isOverPlanLimit(tenantId)) {
      setLimitTenant({ name: selectedTenant.name, limit: billing?.organization_limit ?? 0 });
      return;
    }
    selectTenant(tenantId);
    setOrganizationOpen(false);
    setOrganizationSearch('');
  };

  const openOrganizationCreation = () => {
    if (billing && billing.organization_limit !== 'unlimited' && Number(billing.organizations_used) >= Number(billing.organization_limit)) {
      setLimitTenant({ name: 'a new organization', limit: billing.organization_limit });
      return;
    }
    setOrganizationOpen(false);
    setOrganizationSearch('');
    setCreateOpenPath(location.pathname);
    setCreateOpen(true);
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
          <div ref={organizationDropdownRef} className="relative hidden sm:block">
            <Building2 className="hidden" aria-hidden="true" />
            <button type="button" aria-label="Choose active organization" aria-expanded={organizationOpen} aria-haspopup="listbox" onClick={() => setOrganizationOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'Escape') setOrganizationOpen(false); }} className="group flex min-h-10 w-64 items-center gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-3 text-left shadow-sm shadow-slate-200/50 outline-none transition-[border-color,box-shadow] hover:border-indigo-300 focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/15">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-transform group-active:scale-[0.96]"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{activeTenant?.name ?? 'Select organization'}</span><span className="block truncate text-[11px] text-slate-500">{activeTenant?.slug ?? 'Choose a workspace'}</span></span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150', organizationOpen && 'rotate-180 text-indigo-600')} aria-hidden="true" />
            </button>
            {organizationOpen ? <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[21rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5" role="dialog" aria-label="Organization switcher">
              <div className="border-b border-slate-100 bg-slate-50/80 p-3"><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10"><Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><input type="search" value={organizationSearch} onChange={(event) => setOrganizationSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setOrganizationOpen(false); }} placeholder="Search organizations" aria-label="Search organizations" className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" autoFocus /></div><div className="mt-3 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"><span>Organizations</span><span className="tabular-nums">{filteredOrganizations.length} of {tenants.length}</span></div></div>
              <div className="max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Organizations">{filteredOrganizations.length > 0 ? filteredOrganizations.map((tenant) => { const selected = tenant.id === activeTenant?.id; return <button key={tenant.id} type="button" role="option" aria-selected={selected} onClick={() => selectOrganization(tenant.id)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow] hover:bg-slate-50 focus-visible:bg-indigo-50 focus-visible:outline-none', selected && 'bg-indigo-50/80 ring-1 ring-indigo-100')}><span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold', selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')}>{tenant.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{tenant.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{tenant.slug} · {tenant.role === 'super_admin' ? 'Platform access' : tenant.role ?? 'Member'}</span></span>{selected ? <Check className="h-4 w-4 shrink-0 text-indigo-600" aria-label="Selected organization" /> : null}</button>; }) : <div className="px-4 py-8 text-center"><Building2 className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" /><p className="mt-2 text-sm font-semibold text-slate-700">No organizations found</p><p className="mt-1 text-xs text-slate-500">Try a different name or slug.</p></div>}</div>
              {!isSuperAdmin ? <div className="border-t border-slate-100 bg-slate-50/70 p-2"><button type="button" onClick={openOrganizationCreation} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-none"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">+</span>Create organization</button></div> : null}
            </div> : null}
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
              className="hidden"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} · {tenant.slug}
                </option>
              ))}
              {!isSuperAdmin ? <option value="create">Create organization</option> : null}
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
          <div role="dialog" aria-modal="true" aria-labelledby="organization-limit-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-x-hidden overflow-y-auto rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Plan limit reached</p><h2 id="organization-limit-title" className="mt-1 text-xl font-semibold text-slate-950">Upgrade to open {limitTenant.name}</h2></div></div>
              <button type="button" aria-label="Close organization limit dialog" onClick={() => setLimitTenant(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">This organization is beyond your current allowance of <strong>{limitTenant.limit}</strong> organizations. Upgrade your account plan to access it, or archive an organization you no longer need.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upgradePlans.filter((plan) => {
                if (limitTenant.limit === 'unlimited') return false;
                const currentLimit = Number(limitTenant.limit);
                const planLimit = plan.limits?.organizations;
                return planLimit === 'unlimited' || (Number.isFinite(Number(planLimit)) && Number(planLimit) > currentLimit);
              }).map((plan) => <button key={plan.id} type="button" onClick={() => { setLimitTenant(null); navigate(`/dashboard/billing/checkout/${plan.id}`); }} className="inline-flex min-w-0 w-full items-center justify-between gap-3 rounded-lg bg-[#8200fa] px-4 py-2.5 text-left text-white shadow-sm shadow-[#8200fa]/20 transition hover:bg-[#7000d9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8200fa] focus-visible:ring-offset-2"><span className="min-w-0"><span className="block truncate text-sm font-semibold">Upgrade to {plan.name}</span><span className="mt-0.5 block truncate text-xs text-white/85">{plan.limits?.organizations === 'unlimited' ? 'Unlimited organizations' : `Up to ${plan.limits?.organizations ?? 0} organizations`}</span></span></button>)}
              {upgradePlans.filter((plan) => plan.limits?.organizations === 'unlimited' || Number(plan.limits?.organizations) > Number(limitTenant.limit)).length === 0 ? <button type="button" onClick={() => { setLimitTenant(null); navigate('/dashboard/billing'); }} className="inline-flex items-center justify-center rounded-lg bg-[#8200fa] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#8200fa]/20 transition hover:bg-[#7000d9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8200fa] focus-visible:ring-offset-2">Review available plans</button> : null}
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
