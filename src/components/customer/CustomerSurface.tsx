import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import '../../styles/customer-surfaces.css';

interface CustomerSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div';
  padding?: 'compact' | 'default';
}

export function CustomerSurface({
  as: Component = 'section',
  padding = 'default',
  className,
  ...props
}: CustomerSurfaceProps) {
  return (
    <Component
      {...props}
      className={cn(
        'customer-surface',
        padding === 'compact' && 'customer-surface--compact',
        className,
      )}
    />
  );
}
