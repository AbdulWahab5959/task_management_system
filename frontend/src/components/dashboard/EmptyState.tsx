import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
