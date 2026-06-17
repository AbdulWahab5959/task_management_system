import type { ReactNode } from 'react';
import { Card, CardContent } from '../common/Card';
import { cn } from '../../utils/cn';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet';
}

const toneClasses = {
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
};

export default function StatsCard({ description, icon, title, tone = 'cyan', value }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {icon ? (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', toneClasses[tone])}>
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
