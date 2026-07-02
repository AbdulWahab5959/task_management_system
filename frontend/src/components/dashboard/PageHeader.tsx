import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export default function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">{eyebrow}</p>
        ) : null}
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  );
}
