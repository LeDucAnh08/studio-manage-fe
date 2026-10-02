import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, disabled, children, className, ...props }, ref) => (
    <Button ref={ref} disabled={disabled || loading} className={cn(className)} {...props}>
      {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  ),
);
LoadingButton.displayName = 'LoadingButton';
