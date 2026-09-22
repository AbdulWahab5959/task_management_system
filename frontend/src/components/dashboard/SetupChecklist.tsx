import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SetupChecklistItem } from '../../types/tenant-dashboard.types';

const destinations: Record<string, { href: string; action: string }> = {
  profile: { href: '/dashboard/organizations', action: 'Complete profile' },
  team: { href: '/dashboard/team', action: 'Invite teammate' },
  billing: { href: '/dashboard/billing', action: 'Review billing' },
};

export default function SetupChecklist({ items }: { items: SetupChecklistItem[] }) {
  const remaining = items.filter((item) => !item.completed);
  const completed = items.length - remaining.length;
  const percentage = items.length ? Math.round((completed / items.length) * 100) : 100;
  const next = remaining[0];

  return (
    <div className="space-y-4" aria-label="Workspace setup progress">
      <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-slate-900">{remaining.length ? `${remaining.length} step${remaining.length === 1 ? '' : 's'} to go` : 'Setup complete'}</p><p className="mt-1 text-xs text-slate-500">{completed} of {items.length} recommended steps finished</p></div><span className="text-sm font-bold tabular-nums text-emerald-700">{percentage}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label="Workspace setup completion"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percentage}%` }} /></div>
      <div className="space-y-2">{items.map((item) => { const destination = destinations[item.key]; return <div key={item.key} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${item.completed ? 'border-slate-100 bg-slate-50/60' : 'border-amber-200 bg-amber-50/50'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>{item.completed ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-current" />}</span><span className={`min-w-0 flex-1 text-sm ${item.completed ? 'text-slate-500 line-through' : 'font-semibold text-slate-800'}`}>{item.label}</span>{!item.completed && destination ? <Link to={destination.href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950">{destination.action}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}</div>; })}</div>
      {next && destinations[next.key] ? <Link to={destinations[next.key].href} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Continue setup<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
    </div>
  );
}
