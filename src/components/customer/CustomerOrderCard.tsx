import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import '../../styles/customer-orders.css';

export function CustomerOrderCard({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={cn('customer-order-card', className)} />;
}
