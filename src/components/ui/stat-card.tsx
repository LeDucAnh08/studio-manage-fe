import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  to?: string;
  className?: string;
  hint?: ReactNode;
}

export const StatCard = ({
  label,
  value,
  color = 'text-foreground',
  to,
  className,
  hint,
}: StatCardProps) => {
  const inner = (
    <Card data-ui="stat-card" className={cn('p-5 hover:shadow-md transition-shadow', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
      {(hint || to) && (
        <p className="mt-2 text-xs text-muted-foreground">{hint ?? 'Xem chi tiết →'}</p>
      )}
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
};
