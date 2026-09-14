import { LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type ProfessionalLoaderProps = {
  label: string;
  detail?: string;
  variant?: 'screen' | 'table';
  rows?: number;
  columns?: number;
  className?: string;
};

export default function ProfessionalLoader({
  label,
  detail = 'Gathering the latest information',
  variant = 'screen',
  rows = 5,
  columns = 5,
  className,
}: ProfessionalLoaderProps) {
  if (variant === 'table') {
    return (
      <div className={cn('professional-loader-table', className)} role="status" aria-label={label} aria-busy="true">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" aria-hidden="true" />
            {label}
          </div>
          <span className="hidden text-xs text-slate-400 sm:inline">Please wait</span>
        </div>
        <div className="space-y-2 p-4 sm:p-5">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="professional-loader-row grid gap-3 rounded-xl border border-slate-100 bg-white px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }, (_, column) => (
                <span key={column} className={cn('professional-loader-line', column === 0 && 'professional-loader-line--strong')} />
              ))}
            </div>
          ))}
        </div>
        <span className="sr-only">{detail}</span>
      </div>
    );
  }

  return (
    <div className={cn('professional-loader-screen', className)} role="status" aria-label={label} aria-busy="true">
      <div className="professional-loader-mark" aria-hidden="true">
        <span className="professional-loader-mark__halo" />
        <LoaderCircle className="relative z-10 h-8 w-8 animate-spin text-indigo-600" strokeWidth={1.8} />
      </div>
      <p className="mt-5 text-sm font-bold tracking-tight text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
      <div className="professional-loader-progress mt-5" aria-hidden="true"><span /></div>
      <span className="sr-only">Loading in progress</span>
    </div>
  );
}
