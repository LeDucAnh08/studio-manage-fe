import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import '../../styles/customer-forms.css';

export function CustomerChoice({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn('customer-choice', className)} />;
}
