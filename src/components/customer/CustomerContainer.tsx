import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import '../../styles/customer-shell.css';

interface CustomerContainerProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'main';
  width?: 'editorial' | 'detail' | 'listing';
}

export function CustomerContainer({
  as: Component = 'div',
  width = 'editorial',
  className,
  ...props
}: CustomerContainerProps) {
  return (
    <Component
      {...props}
      className={cn('customer-container', `customer-container--${width}`, className)}
    />
  );
}
