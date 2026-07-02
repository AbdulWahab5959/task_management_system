import type { ReactNode } from 'react';
import { Card, CardContent } from '../common/Card';
import { cn } from '../../utils/cn';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';
}

const variantClasses = {
  indigo: {
    icon: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    glow: 'from-indigo-500/10 via-indigo-500/5',
    marker: 'bg-indigo-500',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    glow: 'from-emerald-500/10 via-emerald-500/5',
    marker: 'bg-emerald-500',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700 ring-amber-100',
    glow: 'from-amber-500/20 via-amber-500/5',
    marker: 'bg-amber-500',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-700 ring-violet-100',
    glow: 'from-violet-500/10 via-violet-500/5',
    marker: 'bg-violet-500',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-700 ring-rose-100',
    glow: 'from-rose-500/10 via-rose-500/5',
    marker: 'bg-rose-500',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    glow: 'from-cyan-500/10 via-cyan-500/5',
    marker: 'bg-cyan-500',
  },
};

const trendClasses = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  neutral: 'text-slate-500',
};

export default function StatsCard({
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
    <Card className="group relative overflow-hidden border-white/70 bg-white/90 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70">
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent opacity-90', tone.glow)} />
      <div className={cn('absolute left-0 top-5 h-8 w-1 rounded-r-full', tone.marker)} />
      <CardContent className="relative flex items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</p>
          {description ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium leading-5 text-slate-500">
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
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition duration-200 group-hover:scale-105 [&>svg]:h-5 [&>svg]:w-5', tone.icon)}>
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
