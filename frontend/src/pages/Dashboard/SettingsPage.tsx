import { Building2, CheckCircle2, Coins, Globe2, Lock, Save, Shield, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import Input from '../../components/common/Input';
import ProfessionalLoader from '../../components/common/ProfessionalLoader';
import PageHeader from '../../components/dashboard/PageHeader';
import { useTenant } from '../../hooks/useTenant';
import { tenantSettingsService } from '../../services/tenant-settings.service';
import type { TenantSettings } from '../../types/tenant-settings.types';

const industries = [
  ['healthcare', 'Healthcare'],
  ['logistics', 'Logistics'],
  ['ecommerce', 'E-commerce'],
  ['real-estate', 'Real estate'],
  ['education', 'Education'],
  ['hospitality', 'Hospitality'],
  ['professional-services', 'Professional services'],
  ['other', 'Other'],
];

const timezones = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];

type SettingsForm = Omit<TenantSettings, 'tenant_id'>;
type ApiErrors = Record<string, string[]>;

function emptyForm(): SettingsForm {
  return {
    name: '',
    website: '',
    industry: '',
    description: '',
    contact_email: '',
    phone: '',
    country: '',
    timezone: 'UTC',
    currency: 'USD',
  };
}

function errorMessage(exception: unknown): { message: string; fields: ApiErrors } {
  const response = (exception as { response?: { data?: { message?: string; errors?: ApiErrors } } }).response;
  return {
    message: response?.data?.message ?? 'Unable to save organization settings.',
    fields: response?.data?.errors ?? {},
  };
}

function FieldError({ errors, field }: { errors: ApiErrors; field: keyof SettingsForm }) {
  return errors[field]?.[0] ? <p className="mt-1 text-xs text-rose-600">{errors[field][0]}</p> : null;
}

export default function SettingsPage() {
  const { activeTenant, refreshTenants, tenants } = useTenant();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ApiErrors>({});
  const [savedMessage, setSavedMessage] = useState('');
  const activeTenantId = activeTenant?.id;

  useEffect(() => {
    if (!activeTenantId) {
      queueMicrotask(() => {
        setForm(emptyForm());
      });
      return;
    }

    let mounted = true;
    const loadSettings = async () => {
      setLoading(true);
      setLoadError('');
      setSavedMessage('');
      setSaveError('');
      setFieldErrors({});
      setForm(emptyForm());

      try {
        const response = await tenantSettingsService.get();
        if (mounted) {
          const settings = response.data.data;
          setForm({
            name: settings.name ?? '',
            website: settings.website ?? '',
            industry: settings.industry ?? '',
            description: settings.description ?? '',
            contact_email: settings.contact_email ?? '',
            phone: settings.phone ?? '',
            country: settings.country ?? '',
            timezone: settings.timezone ?? 'UTC',
            currency: settings.currency ?? 'USD',
          });
        }
      } catch {
        if (mounted) {
          setLoadError('Unable to load organization settings for this workspace.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      void loadSettings();
    });
    return () => {
      mounted = false;
    };
  }, [activeTenantId]);

  const updateField = (field: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: [] }));
    setSavedMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSavedMessage('');
    setFieldErrors({});

    try {
      const response = await tenantSettingsService.update(form);
      const settings = response.data.data;
      setForm({
        name: settings.name ?? '',
        website: settings.website ?? '',
        industry: settings.industry ?? '',
        description: settings.description ?? '',
        contact_email: settings.contact_email ?? '',
        phone: settings.phone ?? '',
        country: settings.country ?? '',
        timezone: settings.timezone ?? 'UTC',
        currency: settings.currency ?? 'USD',
      });
      await refreshTenants();
      setSavedMessage('Organization settings saved.');
    } catch (exception: unknown) {
      const details = errorMessage(exception);
      setSaveError(details.message);
      setFieldErrors(details.fields);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = activeTenant?.role === 'owner' || activeTenant?.role === 'admin';

  if (!activeTenant || tenants.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-indigo-500" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Create or select an organization first.</h1>
          <p className="mt-2 text-sm text-slate-500">Organization settings become available once a workspace is active.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Settings"
        description={`Manage the profile and preferences for ${activeTenant.name}.`}
      />

      {loading ? (
        <Card>
          <CardContent><ProfessionalLoader label="Loading organization settings" detail="Preparing workspace preferences" /></CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-rose-600">{loadError}</CardContent>
        </Card>
      ) : (
        <form className="space-y-6" onSubmit={submit}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>General</CardTitle>
                  <CardDescription>Core identity details for this workspace.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <Input label="Organization name" value={form.name} onChange={(event) => updateField('name', event.target.value)} disabled={!canEdit} />
                <FieldError errors={fieldErrors} field="name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="industry">Industry</label>
                <select id="industry" value={form.industry ?? ''} onChange={(event) => updateField('industry', event.target.value)} disabled={!canEdit} className="dashboard-control">
                  <option value="">Select an industry</option>
                  {industries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <FieldError errors={fieldErrors} field="industry" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="description">Description</label>
                <textarea id="description" value={form.description ?? ''} onChange={(event) => updateField('description', event.target.value)} disabled={!canEdit} maxLength={2000} rows={4} className="dashboard-control h-auto py-2.5" placeholder="A short description of your organization" />
                <FieldError errors={fieldErrors} field="description" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Globe2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Contact</CardTitle>
                  <CardDescription>How customers and partners can reach this organization.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div><Input label="Website" type="url" value={form.website ?? ''} onChange={(event) => updateField('website', event.target.value)} disabled={!canEdit} placeholder="https://example.com" /><FieldError errors={fieldErrors} field="website" /></div>
              <div><Input label="Contact email" type="email" value={form.contact_email ?? ''} onChange={(event) => updateField('contact_email', event.target.value)} disabled={!canEdit} placeholder="hello@example.com" /><FieldError errors={fieldErrors} field="contact_email" /></div>
              <div><Input label="Phone" value={form.phone ?? ''} onChange={(event) => updateField('phone', event.target.value)} disabled={!canEdit} placeholder="+1 555 0100" /><FieldError errors={fieldErrors} field="phone" /></div>
              <div><Input label="Country" value={form.country ?? ''} onChange={(event) => updateField('country', event.target.value)} disabled={!canEdit} placeholder="Pakistan" /><FieldError errors={fieldErrors} field="country" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <Coins className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Defaults used by this organization’s workspace.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="timezone">Timezone</label>
                <select id="timezone" value={form.timezone} onChange={(event) => updateField('timezone', event.target.value)} disabled={!canEdit} className="dashboard-control">
                  {timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
                </select>
                <FieldError errors={fieldErrors} field="timezone" />
              </div>
              <div><Input label="Currency" value={form.currency} onChange={(event) => updateField('currency', event.target.value.toUpperCase())} disabled={!canEdit} maxLength={3} placeholder="USD" /><FieldError errors={fieldErrors} field="currency" /></div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-6 text-sm">
              {savedMessage ? <span className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{savedMessage}</span> : null}
              {saveError ? <span className="text-rose-600">{saveError}</span> : null}
              {!canEdit ? <span className="text-slate-500">Members have read-only access to organization settings.</span> : null}
            </div>
            {canEdit ? <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" aria-hidden="true" />}>Save changes</Button> : null}
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><UserCog className="h-5 w-5 text-slate-500" aria-hidden="true" /><div><CardTitle>Personal settings</CardTitle><CardDescription>Personal profile and password controls remain in Profile.</CardDescription></div></div></CardHeader>
        </Card>
        <Card>
          <CardHeader><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-slate-500" aria-hidden="true" /><div><CardTitle>Security</CardTitle><CardDescription>Account verification and sign-in controls remain user-level.</CardDescription></div></div></CardHeader>
          <CardContent><div className="flex items-center gap-3 text-sm text-slate-600"><Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />Organization settings do not change personal access rules.</div></CardContent>
        </Card>
      </div>
    </>
  );
}
