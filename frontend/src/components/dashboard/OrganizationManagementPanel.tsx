import { Building2, CheckCircle2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../common/Card';
import Input from '../common/Input';
import { useTenant } from '../../hooks/useTenant';
import { tenantSettingsService } from '../../services/tenant-settings.service';
import { tenantService } from '../../services/tenant.service';
import type { TenantSettings } from '../../types/tenant-settings.types';

type OrganizationForm = Omit<TenantSettings, 'tenant_id'>;

const industries = [
  ['healthcare', 'Healthcare'], ['logistics', 'Logistics'], ['ecommerce', 'E-commerce'],
  ['real-estate', 'Real estate'], ['education', 'Education'], ['hospitality', 'Hospitality'],
  ['professional-services', 'Professional services'], ['other', 'Other'],
];
const timezones = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];

function blankOrganization(name = ''): OrganizationForm {
  return { name, website: '', industry: '', description: '', contact_email: '', phone: '', country: '', timezone: 'UTC', currency: 'USD' };
}

export default function OrganizationManagementPanel() {
  const { activeTenant, tenants, selectTenant, createTenant, refreshTenants } = useTenant();
  const [form, setForm] = useState<OrganizationForm>(blankOrganization(activeTenant?.name));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const activeTenantId = activeTenant?.id;
  const activeTenantName = activeTenant?.name ?? '';

  useEffect(() => {
    if (!activeTenantId) return;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setLoading(true);
      setMessage('');
    });
    void tenantSettingsService.get()
      .then((response) => {
        if (!mounted) return;
        const settings = response.data.data;
        setForm({ name: settings.name ?? activeTenantName, website: settings.website ?? '', industry: settings.industry ?? '', description: settings.description ?? '', contact_email: settings.contact_email ?? '', phone: settings.phone ?? '', country: settings.country ?? '', timezone: settings.timezone ?? 'UTC', currency: settings.currency ?? 'USD' });
        setError('');
      })
      .catch(() => {
        if (mounted) {
          setForm(blankOrganization(activeTenantName));
          setError('This organization profile database is not provisioned yet. You can still manage the organization record from the list.');
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [activeTenantId, activeTenantName]);

  const update = (field: keyof OrganizationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTenant) return;
    setSaving(true); setMessage(''); setError('');
    try {
      const response = await tenantSettingsService.update(form);
      const settings = response.data.data;
      setForm({ name: settings.name ?? activeTenant.name, website: settings.website ?? '', industry: settings.industry ?? '', description: settings.description ?? '', contact_email: settings.contact_email ?? '', phone: settings.phone ?? '', country: settings.country ?? '', timezone: settings.timezone ?? 'UTC', currency: settings.currency ?? 'USD' });
      await refreshTenants();
      setMessage('Organization details saved.');
    } catch (exception) {
      const response = (exception as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Unable to save organization details.');
    } finally { setSaving(false); }
  };

  const create = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true); setError(''); setMessage('');
    try {
      await createTenant(newName.trim());
      setNewName(''); setMessage('Organization created and selected.');
    } catch (exception) {
      const response = (exception as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Unable to create organization.');
    } finally { setCreating(false); }
  };

  const remove = async () => {
    if (!activeTenant || deleting) return;
    setDeleting(true); setError('');
    try {
      await tenantService.destroy(activeTenant.id);
      await refreshTenants();
      setDeleteOpen(false);
      setMessage('Organization removed.');
    } catch (exception) {
      const response = (exception as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Unable to remove this organization.');
    } finally { setDeleting(false); }
  };

  if (!activeTenant) return null;

  return (
    <Card className="mb-6 border-indigo-100 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
            <div><CardTitle>Organization management</CardTitle><CardDescription>Create, view, select, and edit all organization profile details from the dashboard.</CardDescription></div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input label="" aria-label="New organization name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New organization name" />
            <Button type="button" className="mt-0.5 shrink-0" isLoading={creating} onClick={() => void create()} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Create</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => (
            <button type="button" key={tenant.id} onClick={() => selectTenant(tenant.id)} className={`flex min-h-16 items-center justify-between rounded-xl border px-4 py-3 text-left transition ${tenant.id === activeTenant.id ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
              <span><span className="block text-sm font-semibold text-slate-900">{tenant.name}</span><span className="block text-xs text-slate-500">{tenant.slug} · {tenant.role ?? 'member'}</span></span>
              {tenant.id === activeTenant.id ? <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600" aria-label="Selected organization" /> : <Pencil className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <form onSubmit={save} className="grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
          <div className="md:col-span-2"><p className="text-sm font-semibold text-slate-900">Edit {activeTenant.name}</p><p className="mt-1 text-xs text-slate-500">Slug and tenant database identity remain unchanged.</p></div>
          <Input label="Organization name" required value={form.name} onChange={(event) => update('name', event.target.value)} disabled={loading} />
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="dashboard-industry">Industry</label><select id="dashboard-industry" value={form.industry ?? ''} onChange={(event) => update('industry', event.target.value)} className="dashboard-control"><option value="">Select an industry</option>{industries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="md:col-span-2"><label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="dashboard-description">Description</label><textarea id="dashboard-description" value={form.description ?? ''} onChange={(event) => update('description', event.target.value)} maxLength={2000} rows={3} className="dashboard-control h-auto py-2.5" /></div>
          <Input label="Website" type="url" value={form.website ?? ''} onChange={(event) => update('website', event.target.value)} placeholder="https://example.com" />
          <Input label="Contact email" type="email" value={form.contact_email ?? ''} onChange={(event) => update('contact_email', event.target.value)} />
          <Input label="Phone" value={form.phone ?? ''} onChange={(event) => update('phone', event.target.value)} />
          <Input label="Country" value={form.country ?? ''} onChange={(event) => update('country', event.target.value)} />
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="dashboard-timezone">Timezone</label><select id="dashboard-timezone" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} className="dashboard-control">{timezones.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></div>
          <Input label="Currency" value={form.currency} onChange={(event) => update('currency', event.target.value.toUpperCase())} maxLength={3} />
          <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2"><div aria-live="polite" className="text-sm">{message ? <span className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{message}</span> : null}{error ? <span className="text-rose-600">{error}</span> : null}</div><div className="flex flex-wrap gap-2">{activeTenant.role === 'owner' ? <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>Delete organization</Button> : null}<Button type="submit" isLoading={saving} disabled={loading} icon={<Save className="h-4 w-4" aria-hidden="true" />}>Save organization</Button></div></div>
        </form>
      </CardContent>
      {deleteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-5 py-8 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="delete-organization-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Delete organization</p><h2 id="delete-organization-title" className="mt-1 text-xl font-semibold text-slate-950">Remove {activeTenant.name}?</h2></div><button type="button" aria-label="Close delete confirmation" onClick={() => setDeleteOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button></div><p className="mt-4 text-sm leading-6 text-slate-600">This removes the organization from your active workspace list. Its historical record is retained safely for audit purposes.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button type="button" variant="danger" isLoading={deleting} onClick={() => void remove()}>Confirm delete</Button></div></div></div> : null}
    </Card>
  );
}
