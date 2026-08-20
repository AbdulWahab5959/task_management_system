import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { useTenant } from '../../hooks/useTenant';

interface TenantCreationFormProps {
  onCreated?: () => void;
  compact?: boolean;
}

export default function TenantCreationForm({ onCreated, compact = false }: TenantCreationFormProps) {
const { createTenant } = useTenant();
  const [form, setForm] = useState({ name: '', industry: '', website: '', contact_email: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await createTenant({
        name: form.name.trim(),
        industry: form.industry,
        website: form.website.trim(),
        contact_email: form.contact_email.trim(),
        description: form.description.trim() || undefined,
      });
      setForm({ name: '', industry: '', website: '', contact_email: '', description: '' });
      onCreated?.();
    } catch (exception: unknown) {
      const data = (exception as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      const errors = data?.errors ?? {};
      setFieldErrors(Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0] ?? 'Invalid value.'])));
      const message = data?.message;
      setError(message ?? 'We could not create that organization. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className={compact ? 'space-y-3' : 'space-y-5'} onSubmit={submit}>
      <Input
        label="Organization name"
        required
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="Acme Logistics"
        maxLength={255}
        error={fieldErrors.name}
        autoFocus={!compact}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="organization-industry">Industry <span className="text-rose-500">*</span></label>
        <select id="organization-industry" required value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} className="dashboard-control w-full">
          <option value="">Select an industry</option>
          <option value="healthcare">Healthcare</option><option value="logistics">Logistics</option><option value="ecommerce">E-commerce</option><option value="real-estate">Real estate</option><option value="education">Education</option><option value="hospitality">Hospitality</option><option value="professional-services">Professional services</option><option value="other">Other</option>
        </select>
        {fieldErrors.industry ? <p className="mt-1.5 text-sm text-rose-600">{fieldErrors.industry}</p> : null}
      </div>
      <Input label="Website URL" type="url" required value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://example.com" error={fieldErrors.website} />
      <Input label="Contact email" type="email" required value={form.contact_email} onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))} placeholder="hello@example.com" error={fieldErrors.contact_email} />
      <div><label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="organization-description">Description <span className="text-xs font-normal text-slate-400">(optional)</span></label><textarea id="organization-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} rows={3} className="dashboard-control h-auto w-full py-2.5" placeholder="What will this workspace be used for?" /></div>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <Button type="submit" isLoading={isSaving} className="w-full">
        Create organization
      </Button>
    </form>
  );
}
