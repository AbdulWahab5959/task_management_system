import { ArrowLeft, Check, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/dashboard/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { tenantMembersService } from '../../services/tenant-members.service';
import type { PermissionMeta } from '../../services/tenant-members.service';
import type { TenantMemberRole } from '../../types/tenant-member.types';
import { showDashboardError, showDashboardSuccess } from '../../utils/dashboardAlert';

type PermissionMember = { id: number; name: string; email: string; role: TenantMemberRole; effective_permissions: string[]; direct_permissions: string[]; protected?: boolean };

function getApiMessage(exception: unknown, fallback: string) {
  return (exception as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

export default function MemberPermissionsPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const [member, setMember] = useState<PermissionMember | null>(null);
  const [groups, setGroups] = useState<Record<string, PermissionMeta[]>>({});
  const [assignable, setAssignable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canManage = activeTenant?.permissions?.includes('members.update_role') ?? false;
  const dirty = selected.slice().sort().join('|') !== initial.slice().sort().join('|');
  const inheritedCount = (member?.effective_permissions ?? []).filter((key) => !selected.includes(key)).length;
  const availableCount = Object.values(groups).flat().filter((permission) => !selected.includes(permission.key) && !(member?.effective_permissions ?? []).includes(permission.key)).length;

  const load = useCallback(async () => {
    const id = Number(memberId);
    if (!Number.isInteger(id) || id < 1) {
      setError('This member link is invalid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [groupsResponse, memberResponse] = await Promise.all([
        tenantMembersService.permissionGroups(),
        tenantMembersService.permissions(id),
      ]);
      const permissionData = memberResponse.data.data;
      const direct = permissionData.direct_permissions;
      setMember({ ...permissionData.user, role: permissionData.role, effective_permissions: permissionData.effective_permissions, direct_permissions: direct, protected: permissionData.protected });
      setGroups(groupsResponse.data.data);
      setAssignable(groupsResponse.data.assignable);
      setSelected(direct);
      setInitial(direct);
    } catch (exception: unknown) {
      setError(getApiMessage(exception, 'Unable to load member permissions.'));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (activeTenant) queueMicrotask(() => { void load(); });
  }, [activeTenant, load]);

  const save = async () => {
    if (!member || saving || member.protected) return;
    setSaving(true);
    try {
      await tenantMembersService.updatePermissions(member.id, selected);
      setInitial(selected);
      void showDashboardSuccess('Permissions updated', `${member.name}'s organization access was updated.`);
    } catch (exception: unknown) {
      void showDashboardError('Permissions were not updated', getApiMessage(exception, 'You do not have permission to perform this action.'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!member || saving || member.protected) return;
    setSaving(true);
    try {
      const response = await tenantMembersService.resetPermissions(member.id);
      const direct = response.data.data.direct_permissions;
      setSelected(direct);
      setInitial(direct);
      setMember((current) => current ? { ...current, effective_permissions: response.data.data.effective_permissions, direct_permissions: direct } : current);
      void showDashboardSuccess('Role defaults restored', 'Direct permissions were reset for this member.');
    } catch (exception: unknown) {
      void showDashboardError('Permissions were not reset', getApiMessage(exception, 'You do not have permission to perform this action.'));
    } finally {
      setSaving(false);
    }
  };

  if (!activeTenant) return null;

  if (!canManage) {
    return <Card className="mx-auto max-w-2xl"><CardContent className="py-16 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" /><h1 className="mt-4 text-xl font-semibold text-slate-950">You do not have permission to manage member permissions.</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Ask an organization owner or administrator with member-management access to make this change.</p><Link to="/dashboard/team" className="mt-6 inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-500"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to team</Link></CardContent></Card>;
  }

  return <>
    <PageHeader eyebrow="Team / Access controls" title={member?.name ?? 'Member permissions'} description={member ? `${member.email} · ${member.role} role` : 'Manage organization-specific access for this member.'} action={<Link to="/dashboard/team" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to team</Link>} />
    {loading ? <Card><CardContent className="flex min-h-64 items-center justify-center"><LoadingSpinner label="Loading permissions" /></CardContent></Card> : error || !member ? <Card><CardContent className="py-14 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-rose-500" aria-hidden="true" /><h1 className="mt-4 text-lg font-semibold text-slate-950">Permissions are unavailable</h1><p className="mt-2 text-sm text-slate-500">{error || 'This member could not be found in the active organization.'}</p><Link to="/dashboard/team" className="mt-5 inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-500"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to team</Link></CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[minmax(14rem,0.65fr)_minmax(0,1.35fr)]">
      <Card className="h-fit"><CardHeader><CardTitle>Member access</CardTitle><CardDescription>Role access is inherited. Direct permissions add organization-specific access.</CardDescription></CardHeader><CardContent><div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-sm font-semibold text-indigo-950">{member.name}</p><p className="mt-1 break-words text-xs text-indigo-800">{member.email}</p><span className="mt-3 inline-flex rounded-lg bg-white px-2.5 py-1 text-xs font-bold capitalize text-indigo-700 ring-1 ring-indigo-100">{member.role}</span></div><p className="mt-4 text-xs leading-5 text-slate-500">Changes take effect immediately after saving.</p></CardContent></Card>
      <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Role and direct permissions</CardTitle><CardDescription>Inherited access comes from the role. Available permissions can be granted directly to this member.</CardDescription></div><span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 sm:inline-flex"><Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />{selected.length} direct</span></div></CardHeader><CardContent><div className="mb-6 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Direct</p><p className="mt-1 text-lg font-bold text-indigo-950">{selected.length}</p><p className="text-xs text-indigo-800">Explicitly granted</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Inherited</p><p className="mt-1 text-lg font-bold text-slate-900">{inheritedCount}</p><p className="text-xs text-slate-600">From the {member.role} role</p></div><div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Available</p><p className="mt-1 text-lg font-bold text-emerald-950">{availableCount}</p><p className="text-xs text-emerald-800">Can be granted directly</p></div></div><div className="mb-6 flex flex-wrap gap-2 text-xs font-semibold"><span className="permissions-legend permissions-legend--direct">Directly granted</span><span className="permissions-legend permissions-legend--inherited">Inherited from role</span><span className="permissions-legend permissions-legend--available">Available to assign</span></div><div className="space-y-6">{Object.entries(groups).map(([group, permissions]) => <section key={group}><h2 className="text-sm font-semibold capitalize text-slate-900">{group}</h2><div className="mt-3 overflow-hidden rounded-xl border border-slate-200">{permissions.map((permission) => { const isDirect = selected.includes(permission.key); const isInherited = (member.effective_permissions ?? []).includes(permission.key) && !isDirect; const isAssignable = assignable.includes(permission.key); return <label key={permission.key} className={`flex gap-3 border-b border-slate-100 p-4 last:border-b-0 ${isInherited ? 'cursor-not-allowed bg-slate-50/80' : isAssignable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed bg-slate-50/50'}`}><input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isDirect || isInherited} disabled={isInherited || !isAssignable} onChange={(event) => setSelected((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">{permission.name}<span className={`permissions-row-state ${isDirect ? 'permissions-row-state--direct' : isInherited ? 'permissions-row-state--inherited' : 'permissions-row-state--available'}`}>{isDirect ? 'Direct' : isInherited ? 'Inherited' : 'Available'}</span></span><span className="mt-1 block text-xs leading-5 text-slate-500">{permission.description}</span></span></label>; })}</div></section>)}</div><div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><Button type="button" variant="ghost" disabled={saving || !dirty} onClick={() => void reset()} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>Reset direct permissions</Button><div className="flex gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={() => navigate('/dashboard/team')}>Cancel</Button><Button type="button" disabled={saving || !dirty} isLoading={saving} onClick={() => void save()} icon={<Save className="h-4 w-4" aria-hidden="true" />}>Save direct permissions</Button></div></div></CardContent></Card>
    </div>}
  </>;
}
