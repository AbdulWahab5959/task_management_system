import { CheckCircle2, MailPlus, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../common/Card';
import Button from '../common/Button';
import { useTenant } from '../../hooks/useTenant';
import { teamInvitationsService } from '../../services/team-invitations.service';
import type { TenantInvitation } from '../../types/team-invitation.types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function PendingInvitationsOnboarding({ invitations }: { invitations: TenantInvitation[] }) {
  const navigate = useNavigate();
  const { refreshTenants, selectTenant, refreshPendingInvitations } = useTenant();
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const accept = async (invitation: TenantInvitation) => {
    setWorkingId(invitation.id);
    setError('');
    try {
      const response = await teamInvitationsService.acceptForUser(invitation.id);
      const tenants = await refreshTenants();
      const joinedTenant = tenants.find((tenant) => tenant.id === response.data.tenant_id);
      if (joinedTenant) selectTenant(joinedTenant.id);
      navigate('/dashboard/team', { replace: true, state: { teamMessage: `You joined ${invitation.tenant?.name ?? 'this organization'}.` } });
    } catch (exception: unknown) {
      setError((exception as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Unable to accept this invitation.');
    } finally {
      setWorkingId(null);
    }
  };

  const reject = async (invitation: TenantInvitation) => {
    setWorkingId(invitation.id);
    setError('');
    try {
      await teamInvitationsService.rejectForUser(invitation.id);
      await refreshPendingInvitations();
    } catch (exception: unknown) {
      setError((exception as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Unable to decline this invitation.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="p-7 sm:p-9">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <MailPlus className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Team invitation</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">You have been invited to join an organization</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Accept an invitation below to join the organization without creating your own workspace.</p>
        </div>

        {error ? <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-7 space-y-3">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">{invitation.tenant?.name ?? 'Organization'}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">You were invited by {invitation.invited_by?.name ?? 'a team administrator'} as a {invitation.role}.</p>
                  <p className="mt-2 text-xs text-slate-500">Expires {formatDate(invitation.expires_at)}</p>
                </div>
                <span className="dashboard-badge bg-amber-50 text-amber-700 ring-amber-100">Pending</span>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button isLoading={workingId === invitation.id} disabled={workingId !== null} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} onClick={() => void accept(invitation)}>Accept invitation</Button>
                <Button variant="secondary" disabled={workingId !== null} icon={<XCircle className="h-4 w-4" aria-hidden="true" />} onClick={() => void reject(invitation)}>Decline</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
