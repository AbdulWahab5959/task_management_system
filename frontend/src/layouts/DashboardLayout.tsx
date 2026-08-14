import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';
import Sidebar from '../components/dashboard/Sidebar';
import { useTenant } from '../hooks/useTenant';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading, error, refreshTenants } = useTenant();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <LoadingSpinner label="Loading your organizations" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <p className="text-sm text-slate-300">{error}</p>
        <Button variant="secondary" onClick={() => void refreshTenants()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen overflow-x-hidden text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-col lg:pl-64">
        <DashboardNavbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
          <div className="mx-auto w-full max-w-[1500px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
