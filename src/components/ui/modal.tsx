import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-5xl',
};

/**
 * Convenience wrapper around shadcn Dialog with title + sized content,
 * matching the project's previous Modal API ergonomics.
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  className,
  contentClassName,
}: ModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      {...(description ? {} : { 'aria-describedby': undefined })}
      className={cn(sizeClass[size], 'max-h-[calc(100dvh-2rem)] overflow-y-auto', contentClassName)}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <div className={className}>{children}</div>
    </DialogContent>
  </Dialog>
);
