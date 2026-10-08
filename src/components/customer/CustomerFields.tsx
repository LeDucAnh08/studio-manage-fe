import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export const CustomerInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('customer-control', className)} {...props} />
  ),
);
CustomerInput.displayName = 'CustomerInput';

export const CustomerTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('customer-control', className)} {...props} />
));
CustomerTextarea.displayName = 'CustomerTextarea';

export const CustomerSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn('customer-control', className)} {...props} />
));
CustomerSelect.displayName = 'CustomerSelect';

interface CustomerFormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}

interface ControlDescription {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

export function CustomerFormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  children,
}: CustomerFormFieldProps) {
  const descriptionId = useId();
  const hasDescription = Boolean(error || hint);
  const control = isValidElement<ControlDescription>(children)
    ? cloneElement(children, {
        'aria-describedby':
          [children.props['aria-describedby'], hasDescription ? descriptionId : undefined]
            .filter(Boolean)
            .join(' ') || undefined,
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })
    : children;
  return (
    <div className={cn('customer-field', className)}>
      <label className="customer-field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="customer-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={descriptionId} className="customer-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="customer-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
