import { Building2 } from 'lucide-react';
import { Card } from '../common/Card';
import TenantCreationForm from './TenantCreationForm';

export default function TenantOnboarding() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10">
      <Card className="w-full max-w-lg border-white/10 bg-white p-7 shadow-2xl shadow-black/20 sm:p-9">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <Building2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Workspace setup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create your organization to continue.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Your organization is the secure workspace where your LaunchStack data will live.</p>
          <div className="mt-7 text-left">
            <TenantCreationForm />
          </div>
        </div>
      </Card>
    </div>
  );
}
