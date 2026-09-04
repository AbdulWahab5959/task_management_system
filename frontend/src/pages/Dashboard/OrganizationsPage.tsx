import { Building2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import PageHeader from '../../components/dashboard/PageHeader';
import OrganizationManagementPanel from '../../components/dashboard/OrganizationManagementPanel';
import TenantCreationForm from '../../components/dashboard/TenantCreationForm';
import EmptyState from '../../components/dashboard/EmptyState';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';

export default function OrganizationsPage() {
  const { activeTenant, tenants } = useTenant();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <>
      <PageHeader
        eyebrow="Workspace administration"
        title="Organizations"
        description={isSuperAdmin ? 'Review and manage every active organization across the LaunchStack platform.' : 'Create, review, update, switch, and safely remove the organizations you manage.'}
        action={<Link to="/dashboard"><Button variant="secondary">Back to dashboard</Button></Link>}
      />

      {activeTenant && tenants.length > 0 ? <OrganizationManagementPanel /> : (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-xl text-center">
              <Building2 className="mx-auto h-10 w-10 text-indigo-500" aria-hidden="true" />
              {isSuperAdmin ? <>
                <EmptyState icon={<Building2 className="h-6 w-6" aria-hidden="true" />} eyebrow="Platform overview" title="No active organizations yet" description="New customer workspaces will appear here after they are created and activated." action={<Link to="/dashboard/admin" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Open admin tools</Link>} />
              </> : <>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">Create your first organization</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Your organization is the workspace where your team, settings, and subscription live.</p>
                <div className="mx-auto mt-6 max-w-md text-left"><TenantCreationForm /></div>
                <p className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Organization limits follow your current plan.</p>
              </>}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
