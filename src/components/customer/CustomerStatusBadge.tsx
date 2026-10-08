import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import '../../styles/customer-surfaces.css';

interface CustomerStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'error';
}

export function CustomerStatusBadge({
  tone = 'neutral',
  className,
  ...props
}: CustomerStatusBadgeProps) {
  return (
    <span
      {...props}
      className={cn('customer-status', tone === 'error' && 'customer-status--error', className)}
    />
  );
}
