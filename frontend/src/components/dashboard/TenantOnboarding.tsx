import { Building2, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import TenantCreationForm from './TenantCreationForm';

export default function TenantOnboarding() {
  return (
    <div className="min-h-[calc(100dvh-7rem)] py-4 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5f7e1a]">Workspace setup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Finish setting up LaunchStack.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Your subscription is active. Add a few workspace details and your dashboard will be ready for work.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 shadow-sm shadow-emerald-100/70">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Subscription active
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <section className="relative overflow-hidden rounded-2xl bg-[#0b0d0c] p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8 lg:sticky lg:top-24">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#d7f36b]/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d7f36b] text-[#0b0d0c] shadow-[0_10px_30px_rgb(215_243_107_/_0.18)]">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#d7f36b]">Your LaunchStack workspace</p>
              <h2 className="mt-3 max-w-sm text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">A focused home for your team and work.</h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">This workspace keeps your organization profile, members, projects, tasks, and settings together.</p>

              <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                <div className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#d7f36b]" aria-hidden="true" /> Centralized organization data</div>
                <div className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#d7f36b]" aria-hidden="true" /> Invite your team when you are ready</div>
                <div className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#d7f36b]" aria-hidden="true" /> Update these details later in settings</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-200/50 ring-1 ring-white/80 sm:p-7">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f9d8] text-[#5f7e1a] ring-1 ring-[#dfe9c4]">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Tell us about your organization</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">These details personalize your workspace and can be edited later.</p>
              </div>
            </div>
            <div className="pt-6">
              <TenantCreationForm compact />
            </div>
            <div className="mt-5 flex items-start gap-2.5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              Your organization data is protected by your LaunchStack account permissions.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
