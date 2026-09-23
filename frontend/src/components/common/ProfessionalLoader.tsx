import { Activity } from 'lucide-react';
import { cn } from '../../utils/cn';

type ProfessionalLoaderProps = {
  label: string;
  detail?: string;
  variant?: 'screen' | 'table';
  rows?: number;
  columns?: number;
  className?: string;
};

const lineWidths = ['88%', '68%', '76%', '54%', '82%', '63%'];

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
      <div className={cn('professional-loader-table', className)} role="status" aria-live="polite" aria-label={label} aria-busy="true">
        <div className="professional-loader-table__header">
          <div className="professional-loader-table__title">
            <span className="professional-loader-table__pulse" aria-hidden="true"><Activity size={14} /></span>
            <span>{label}</span>
          </div>
          <span className="professional-loader-table__detail">{detail}</span>
        </div>
        <div className="professional-loader-table__body">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="professional-loader-row" style={{ gridTemplateColumns: `minmax(9rem, 1.5fr) repeat(${Math.max(columns - 1, 1)}, minmax(4rem, 1fr))` }} aria-hidden="true">
              {Array.from({ length: columns }, (_, column) => (
                <span key={column} className={cn('professional-loader-line', column === 0 && 'professional-loader-line--strong')} style={{ width: column === 0 ? lineWidths[(row + 1) % lineWidths.length] : undefined }} />
              ))}
            </div>
          ))}
        </div>
        <span className="sr-only">{detail}</span>
      </div>
    );
  }

  return (
    <div className={cn('professional-loader-screen', className)} role="status" aria-live="polite" aria-label={label} aria-busy="true">
      <div className="professional-loader-screen__panel">
        <div className="professional-loader-screen__status" aria-hidden="true">
          <span className="professional-loader-screen__status-dot" />
          <span>In progress</span>
        </div>
        <div className="professional-loader-screen__copy">
          <p className="professional-loader-screen__label">{label}</p>
          <p className="professional-loader-screen__detail">{detail}</p>
        </div>
        <div className="professional-loader-progress" aria-hidden="true"><span /></div>
      </div>
      <span className="sr-only">Loading in progress</span>
    </div>
  );
}
