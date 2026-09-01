import { MailPlus, RefreshCw, Send, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/dashboard/PageHeader';
import PendingInvitationsOnboarding from '../../components/dashboard/PendingInvitationsOnboarding';
import { useTenant } from '../../hooks/useTenant';
import { teamInvitationsService } from '../../services/team-invitations.service';
import { tenantMembersService } from '../../services/tenant-members.service';
import type { InvitationRole, TenantInvitation } from '../../types/team-invitation.types';
import type { TenantMember } from '../../types/tenant-member.types';
import type { PermissionMeta } from '../../services/tenant-members.service';

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not available';
}

function getApiMessage(exception: unknown, fallback: string) {
  return (exception as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

function RoleBadge({ role }: { role: TenantMember['role'] }) {
  const styles = role === 'owner' ? 'bg-violet-50 text-violet-700 ring-violet-100' : role === 'admin' ? 'bg-indigo-50 text-indigo-700 ring-indigo-100' : 'bg-slate-100 text-slate-600 ring-slate-200';
  return <span className={`dashboard-badge ${styles}`}>{role[0].toUpperCase() + role.slice(1)}</span>;
}

export default function TeamPage() {
  const location = useLocation();
  const { activeTenant, tenants, pendingInvitations, pendingInvitationsLoading } = useTenant();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitationRole>('member');
  const [actionKey, setActionKey] = useState('');
  const [confirmMember, setConfirmMember] = useState<TenantMember | null>(null);
  const [permissionMember, setPermissionMember] = useState<TenantMember | null>(null);
  const [permissionGroups, setPermissionGroups] = useState<Record<string, PermissionMeta[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(() => (location.state as { teamMessage?: string } | null)?.teamMessage ?? '');
  const activeTenantIdRef = useRef<number | undefined>(undefined);

  const actorRole = activeTenant?.role;
  const actorPermissions = activeTenant?.permissions ?? [];
  const canManage = actorPermissions.includes('members.update_role');
  const canInvite = actorPermissions.includes('members.invite');
  const canViewInvitations = actorPermissions.includes('invitations.view');
  const canInviteAdmin = actorRole === 'owner';
  const permissionDirty = selectedPermissions.slice().sort().join('|') !== initialPermissions.slice().sort().join('|');

  const loadMembers = async () => {
    const tenantId = activeTenant?.id;
    if (!tenantId) {
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const response = await tenantMembersService.list();
      if (activeTenantIdRef.current === tenantId) setMembers(response.data.data);
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to load team members.'));
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadInvitations = async () => {
    const tenantId = activeTenant?.id;
    if (!tenantId || !canViewInvitations) {
      setInvitations([]);
      return;
    }
    setLoadingInvitations(true);
    try {
      const response = await teamInvitationsService.list();
      if (activeTenantIdRef.current === tenantId) setInvitations(response.data.data);
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to load pending invitations.'));
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const refreshTeam = async () => {
    setError('');
    await Promise.all([loadMembers(), loadInvitations()]);
  };

  useEffect(() => {
    activeTenantIdRef.current = activeTenant?.id;
    queueMicrotask(() => {
      setMembers([]);
      setInvitations([]);
      setMessage('');
      setError('');
      void refreshTeam();
    });
    // Active tenant is intentionally the sole data-context dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id, canViewInvitations]);

  const submitInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await teamInvitationsService.create(email.trim(), inviteRole);
      setEmail('');
      setMessage(response.data.message ?? 'Invitation sent.');
      await loadInvitations();
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to send invitation.'));
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (member: TenantMember, role: 'admin' | 'member') => {
    setActionKey(`role-${member.id}`);
    setError('');
    setMessage('');
    try {
      await tenantMembersService.updateRole(member.id, role);
      setMessage(`${member.name}'s role was updated.`);
      await loadMembers();
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to update member role.'));
    } finally {
      setActionKey('');
    }
  };

  const removeMember = async () => {
    if (!confirmMember) return;
    const member = confirmMember;
    setActionKey(`remove-${member.id}`);
    setError('');
    setMessage('');
    try {
      await tenantMembersService.remove(member.id);
      setMessage(`${member.name} was removed from the organization.`);
      setConfirmMember(null);
      await loadMembers();
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to remove member.'));
    } finally {
      setActionKey('');
    }
  };

  const openPermissions = async (member: TenantMember) => {
    if (member.protected || !canManage) return;
    setPermissionMember(member);
    setLoadingPermissions(true);
    setError('');
    try {
      const [groupsResponse, memberResponse] = await Promise.all([tenantMembersService.permissionGroups(), tenantMembersService.permissions(member.id)]);
      const direct = memberResponse.data.data.direct_permissions;
      setPermissionGroups(groupsResponse.data.data);
      setSelectedPermissions(direct);
      setInitialPermissions(direct);
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to load permissions.'));
      setPermissionMember(null);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const closePermissions = () => {
    if (permissionDirty && !window.confirm('Discard your unsaved permission changes?')) return;
    setPermissionMember(null);
  };

  const savePermissions = async () => {
    if (!permissionMember || savingPermissions) return;
    setSavingPermissions(true); setError(''); setMessage('');
    try {
      await tenantMembersService.updatePermissions(permissionMember.id, selectedPermissions);
      setInitialPermissions(selectedPermissions);
      setMessage(`${permissionMember.name}'s permissions were updated.`);
      setPermissionMember(null);
      await loadMembers();
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to save permissions.'));
    } finally { setSavingPermissions(false); }
  };

  const resetPermissions = async () => {
    if (!permissionMember || savingPermissions) return;
    setSavingPermissions(true); setError('');
    try {
      const response = await tenantMembersService.resetPermissions(permissionMember.id);
      const direct = response.data.data.direct_permissions;
      setSelectedPermissions(direct); setInitialPermissions(direct);
      setMessage('Role defaults restored.');
      await loadMembers();
    } catch (exception: unknown) { setError(getApiMessage(exception, 'Unable to reset permissions.')); }
    finally { setSavingPermissions(false); }
  };

  const resend = async (id: number) => {
    setActionKey(`resend-${id}`);
    setError('');
    setMessage('');
    try {
      const response = await teamInvitationsService.resend(id);
      setMessage(response.data.message ?? 'Invitation resent.');
      await loadInvitations();
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to resend invitation.'));
    } finally {
      setActionKey('');
    }
  };

  const revoke = async (id: number) => {
    setActionKey(`revoke-${id}`);
    setError('');
    setMessage('');
    try {
      const response = await teamInvitationsService.revoke(id);
      setMessage(response.data.message ?? 'Invitation revoked.');
      await loadInvitations();
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to revoke invitation.'));
    } finally {
      setActionKey('');
    }
  };

  if (!activeTenant || tenants.length === 0) {
    if (pendingInvitationsLoading) return <div className="flex min-h-64 items-center justify-center"><LoadingSpinner label="Checking your invitations" /></div>;
    if (pendingInvitations.length > 0) return <PendingInvitationsOnboarding invitations={pendingInvitations} />;
    return <Card className="mx-auto max-w-2xl"><CardContent className="py-16 text-center"><Users className="mx-auto h-10 w-10 text-indigo-500" aria-hidden="true" /><h1 className="mt-4 text-xl font-semibold text-slate-950">Create or select an organization first.</h1><p className="mt-2 text-sm text-slate-500">Team management becomes available once a workspace is active.</p></CardContent></Card>;
  }

  return (
    <>
      <PageHeader eyebrow="Team" title="Team members" description={`Manage active membership and invitations for ${activeTenant.name}.`} />
      {error ? <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <Card>
        <CardHeader><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100"><Users className="h-5 w-5" aria-hidden="true" /></span><div><CardTitle>Active members</CardTitle><CardDescription>Current members come directly from the secure tenant membership record.</CardDescription></div></div><Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={() => void loadMembers()}>Refresh</Button></div></CardHeader>
        <CardContent>
          {loadingMembers ? <div className="flex min-h-32 items-center justify-center"><LoadingSpinner label="Loading team members" /></div> : members.length === 0 ? <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-5 py-8 text-center text-sm text-amber-800">No active members were returned. This may indicate inconsistent tenant membership data.</div> : <div className="space-y-3">{members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{member.name}</p><p className="truncate text-xs text-slate-500">{member.email} - Joined {formatDate(member.joined_at)}</p><p className="mt-1 text-xs text-slate-500">{member.effective_permissions?.length ?? 0} effective permissions{member.direct_permissions?.length ? ` · ${member.direct_permissions.length} direct` : ''}</p></div></div><div className="flex flex-wrap items-center gap-2"><RoleBadge role={member.role} />{member.role !== 'owner' && canManage ? <Button size="sm" variant="secondary" disabled={actionKey !== ''} onClick={() => void openPermissions(member)}>Permissions</Button> : null}{member.role !== 'owner' && actorRole === 'owner' ? <Button size="sm" variant="secondary" disabled={actionKey !== ''} onClick={() => void updateRole(member, member.role === 'admin' ? 'member' : 'admin')}>{actionKey === `role-${member.id}` ? 'Updating...' : member.role === 'admin' ? 'Make member' : 'Make admin'}</Button> : null}{member.role !== 'owner' && ((actorRole === 'owner') || (actorRole === 'admin' && member.role === 'member')) ? <Button size="sm" variant="ghost" disabled={actionKey !== ''} icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setConfirmMember(member)}>Remove</Button> : null}</div></div>)}</div>}
        </CardContent>
      </Card>

      {canInvite || canViewInvitations ? <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">{canInvite ? <Card className="h-fit"><CardHeader><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"><UserPlus className="h-5 w-5" aria-hidden="true" /></span><div><CardTitle>Invite a teammate</CardTitle><CardDescription>Send a secure, expiring invitation.</CardDescription></div></div></CardHeader><CardContent><form className="space-y-4" onSubmit={submitInvitation}><Input label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" required /><div><label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="invite-role">Role</label><select id="invite-role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as InvitationRole)} className="dashboard-control"><option value="member">Member</option>{canInviteAdmin ? <option value="admin">Admin</option> : null}</select></div><Button type="submit" isLoading={saving} icon={<Send className="h-4 w-4" aria-hidden="true" />} className="w-full">Send invitation</Button></form></CardContent></Card> : null}{canViewInvitations ? <Card><CardHeader><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><MailPlus className="h-5 w-5" aria-hidden="true" /></span><div><CardTitle>Pending invitations</CardTitle><CardDescription>Pending invitations are separate from active members.</CardDescription></div></div><Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={() => void loadInvitations()}>Refresh</Button></div></CardHeader><CardContent>{loadingInvitations ? <div className="flex min-h-32 items-center justify-center"><LoadingSpinner label="Loading invitations" /></div> : invitations.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center"><MailPlus className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-700">No pending invitations</p></div> : <div className="space-y-3">{invitations.map((invitation) => <div key={invitation.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{invitation.email}</p><p className="mt-1 text-xs text-slate-500">{invitation.role} - Invited by {invitation.invited_by?.name ?? 'Unknown'} - Expires {formatDate(invitation.expires_at)}</p></div><span className="dashboard-badge bg-amber-50 text-amber-700 ring-amber-100">{invitation.status}</span></div><div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" disabled={invitation.status !== 'pending' || actionKey !== ''} onClick={() => void resend(invitation.id)}>{actionKey === `resend-${invitation.id}` ? 'Working...' : 'Resend'}</Button><Button size="sm" variant="ghost" disabled={invitation.status !== 'pending' || actionKey !== ''} onClick={() => void revoke(invitation.id)}>Revoke</Button></div></div>)}</div>}</CardContent></Card> : null}</div> : <Card className="mt-6"><CardContent className="flex items-center gap-3 py-5 text-sm text-slate-600"><ShieldCheck className="h-5 w-5 text-slate-400" aria-hidden="true" />Members can view the team but cannot manage roles, remove members, or manage invitations.</CardContent></Card>}

      {confirmMember ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Remove member</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Remove {confirmMember.name}?</h2></div><button type="button" aria-label="Close confirmation" onClick={() => setConfirmMember(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><p className="mt-4 text-sm leading-6 text-slate-600">They will lose access to this organization immediately. This does not delete their LaunchStack account.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={actionKey !== ''} onClick={() => setConfirmMember(null)}>Cancel</Button><Button variant="danger" isLoading={actionKey === `remove-${confirmMember.id}`} onClick={() => void removeMember()}>Remove member</Button></div></div></div> : null}
      {permissionMember ? <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm" role="presentation"><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="permissions-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Access controls</p><h2 id="permissions-title" className="mt-1 text-xl font-semibold text-slate-950">{permissionMember.name}</h2><p className="mt-1 text-sm text-slate-500">{permissionMember.email} · {permissionMember.role} role</p></div><button type="button" aria-label="Close permissions" onClick={closePermissions} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-950"><p className="font-semibold">Direct permissions</p><p className="mt-1 leading-5 text-indigo-800">Role permissions are inherited automatically. These selections add the member's organization-specific access and take effect immediately.</p></div>{loadingPermissions ? <div className="mt-6 space-y-3" aria-label="Loading permission groups"><div className="item-skeleton h-14 rounded-xl" /><div className="item-skeleton h-14 rounded-xl" /><div className="item-skeleton h-14 rounded-xl" /></div> : <div className="mt-6 space-y-6">{Object.entries(permissionGroups).map(([group, permissions]) => <section key={group}><h3 className="text-sm font-semibold text-slate-900">{group}</h3><div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">{permissions.map((permission) => <label key={permission.key} className="flex cursor-pointer gap-3 p-3.5 hover:bg-slate-50"><input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={selectedPermissions.includes(permission.key)} onChange={(event) => setSelectedPermissions((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} /><span><span className="block text-sm font-medium text-slate-800">{permission.name}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{permission.description}</span></span></label>)}</div></section>)}</div>}<div className="sticky bottom-0 mt-8 flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-white pt-4"><Button variant="ghost" disabled={savingPermissions} onClick={() => void resetPermissions()}>Reset to role defaults</Button><div className="flex gap-2"><Button variant="secondary" disabled={savingPermissions} onClick={closePermissions}>Cancel</Button><Button isLoading={savingPermissions} disabled={!permissionDirty} onClick={() => void savePermissions()}>Save changes</Button></div></div></aside></div> : null}
    </>
  );
}
