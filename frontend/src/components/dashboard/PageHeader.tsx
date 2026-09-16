import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({ action, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className={['mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className].filter(Boolean).join(' ')}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="support-page-header__eyebrow">{eyebrow}</p>
        ) : null}
        <h1 className="support-page-header__title">{title}</h1>
        {description ? (
          <p className="support-page-header__description">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  );
}
