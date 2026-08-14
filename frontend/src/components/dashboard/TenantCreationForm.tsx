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
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter an organization name.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await createTenant(name.trim());
      setName('');
      onCreated?.();
    } catch (exception: unknown) {
      const message = (exception as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data?.message;
      setError(message ?? 'We could not create that organization. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className={compact ? 'space-y-3' : 'space-y-5'} onSubmit={submit}>
      <Input
        label="Organization name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Acme Logistics"
        maxLength={255}
        error={error}
        autoFocus={!compact}
      />
      <Button type="submit" isLoading={isSaving} className="w-full">
        Create organization
      </Button>
    </form>
  );
}
