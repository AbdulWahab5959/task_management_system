import type { ReactNode } from 'react';
import { Card, CardContent } from '../common/Card';
import { cn } from '../../utils/cn';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';
}

const variantClasses = {
  indigo: {
    icon: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    surface: 'bg-slate-50/85',
    marker: 'bg-indigo-500',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    surface: 'bg-emerald-50/65',
    marker: 'bg-emerald-500',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700 ring-amber-100',
    surface: 'bg-amber-50/70',
    marker: 'bg-amber-500',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-700 ring-violet-100',
    surface: 'bg-violet-50/55',
    marker: 'bg-violet-500',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-700 ring-rose-100',
    surface: 'bg-rose-50/55',
    marker: 'bg-rose-500',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    surface: 'bg-cyan-50/55',
    marker: 'bg-cyan-500',
  },
};

const trendClasses = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  neutral: 'text-slate-500',
};

export default function StatsCard({
  className,
  compact = false,
  description,
  icon,
  title,
  trend,
  trendValue,
  variant = 'indigo',
  value,
}: StatsCardProps) {
  const tone = variantClasses[variant];

  return (
    <Card className={cn('group relative h-full overflow-hidden border-slate-200/80 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70', compact ? 'min-h-[8rem]' : 'min-h-[9rem]', tone.surface, className)}>
      <div className={cn('absolute left-0 top-5 h-8 w-1 rounded-r-full', tone.marker)} />
      <CardContent className={cn('relative flex h-full items-start justify-between gap-3', compact ? 'px-4 py-3.5' : 'px-5 py-4')}>
        <div className={cn('min-w-0 flex-1', compact && 'pr-1')}>
          <p className={cn('text-xs font-semibold uppercase tracking-wide text-slate-500', compact && 'whitespace-nowrap text-[0.68rem] leading-4')}>{title}</p>
          <p className={cn('mt-1 font-bold tracking-tight text-slate-950 tabular-nums', compact ? 'whitespace-nowrap text-lg leading-6' : 'text-xl')}>{value}</p>
          {description ? (
            <p className={cn('mt-1 flex items-center gap-1 font-medium text-slate-500', compact ? 'whitespace-nowrap text-[0.7rem] leading-4' : 'text-xs leading-5')}>
              {trend && trendValue ? (
                <span className={cn('inline-flex items-center gap-0.5 font-medium', trendClasses[trend])}>
                  {trendValue}
                </span>
              ) : null}
              {description}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn('flex shrink-0 items-center justify-center rounded-lg ring-1 transition duration-200 group-hover:scale-105', compact ? 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4' : 'h-10 w-10 [&>svg]:h-5 [&>svg]:w-5', tone.icon)}>
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
