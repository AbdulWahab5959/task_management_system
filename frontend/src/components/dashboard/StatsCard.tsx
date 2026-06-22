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
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
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
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {description ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
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
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1', variantClasses[variant])}>
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}