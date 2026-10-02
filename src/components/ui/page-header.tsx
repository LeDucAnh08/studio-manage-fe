import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  kicker?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, kicker, description, action, className }: PageHeaderProps) => (
  <div
    className={cn(
      'flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6',
      className,
    )}
  >
    <div className="space-y-1">
      {kicker && (
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {kicker}
        </span>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="self-start md:self-auto">{action}</div>}
  </div>
);
