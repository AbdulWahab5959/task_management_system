import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';
import Sidebar from '../components/dashboard/Sidebar';
import { useTenant } from '../hooks/useTenant';
import SupportWidget from '../components/support/SupportWidget';
import { useAuth } from '../hooks/useAuth';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { error, refreshTenants } = useTenant();
  const { user } = useAuth();
  const showFloatingSupport = user?.role !== 'super_admin' && location.pathname !== '/dashboard/support-center';

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-col lg:pl-64">
        <DashboardNavbar onMenuClick={() => setSidebarOpen(true)} />
        <main className={`min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-6 ${showFloatingSupport ? 'dashboard-main-with-support' : ''}`}>
          <div className="mx-auto w-full max-w-[1500px]">
            {error ? (
              <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="min-w-0 flex-1">{error}</span>
                <button type="button" onClick={() => void refreshTenants()} className="min-h-10 shrink-0 rounded-lg px-3 font-semibold text-amber-800 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Retry</button>
              </div>
            ) : null}
            <Outlet />
          </div>
        </main>
        {showFloatingSupport ? <SupportWidget /> : null}
      </div>
    </div>
  );
}
