import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode | ((props: FieldControlProps) => React.ReactNode);
}

export const FormField = ({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  children,
}: FormFieldProps) => {
  const descriptionId = React.useId();
  const controlProps: FieldControlProps = {
    id: htmlFor,
    'aria-describedby': error || hint ? descriptionId : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
  };
  const control =
    typeof children === 'function'
      ? children(controlProps)
      : React.isValidElement<FieldControlProps>(children) &&
          htmlFor &&
          children.props.id === htmlFor
        ? React.cloneElement(children, {
            'aria-describedby':
              [children.props['aria-describedby'], controlProps['aria-describedby']]
                .filter(Boolean)
                .join(' ') || undefined,
            'aria-invalid': controlProps['aria-invalid'] ?? children.props['aria-invalid'],
            'aria-required': controlProps['aria-required'] ?? children.props['aria-required'],
          })
        : children;
  return (
    <div data-ui="form-field" className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive ml-0.5">
            *
          </span>
        )}
      </Label>
      {control}
      {hint && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={descriptionId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
