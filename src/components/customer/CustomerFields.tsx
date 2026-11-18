import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useCustomerControl } from '@/hooks/useCustomerControl';
import { cn } from '@/lib/utils';

export const CustomerInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { validation?: (value: string) => string | undefined }
>(({ className, validation, onBlur, onChange, onInvalid, ...props }, forwardedRef) => {
  const { elementRef, error, label, errorId, check, invalid, blur } = useCustomerControl(
    forwardedRef,
    props,
    validation,
  );
  const describedBy =
    [props['aria-describedby'], error && !props['aria-errormessage'] ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <>
      <input
        data-customer-control="true"
        {...props}
        ref={elementRef}
        className={cn('customer-control', className)}
        aria-label={props['aria-label'] || label}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        onBlur={(event) => {
          blur(event.currentTarget, event.relatedTarget);
          onBlur?.(event);
        }}
        onChange={(event) => {
          check(event.currentTarget);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          invalid(event.currentTarget);
          onInvalid?.(event);
        }}
      />
      {error && !props['aria-errormessage'] && (
        <p id={errorId} className="customer-field__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
});
CustomerInput.displayName = 'CustomerInput';

export const CustomerTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    validation?: (value: string) => string | undefined;
  }
>(({ className, validation, onBlur, onChange, onInvalid, ...props }, forwardedRef) => {
  const { elementRef, error, label, errorId, check, invalid, blur } = useCustomerControl(
    forwardedRef,
    props,
    validation,
  );
  const describedBy =
    [props['aria-describedby'], error && !props['aria-errormessage'] ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <>
      <textarea
        data-customer-control="true"
        {...props}
        ref={elementRef}
        className={cn('customer-control', className)}
        aria-label={props['aria-label'] || label}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        onBlur={(event) => {
          blur(event.currentTarget, event.relatedTarget);
          onBlur?.(event);
        }}
        onChange={(event) => {
          check(event.currentTarget);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          invalid(event.currentTarget);
          onInvalid?.(event);
        }}
      />
      {error && !props['aria-errormessage'] && (
        <p id={errorId} className="customer-field__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
});
CustomerTextarea.displayName = 'CustomerTextarea';

export const CustomerSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { validation?: (value: string) => string | undefined }
>(({ className, validation, onBlur, onChange, onInvalid, ...props }, forwardedRef) => {
  const { elementRef, error, label, errorId, check, invalid, blur } = useCustomerControl(
    forwardedRef,
    props,
    validation,
  );
  const describedBy =
    [props['aria-describedby'], error && !props['aria-errormessage'] ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <>
      <select
        data-customer-control="true"
        {...props}
        ref={elementRef}
        className={cn('customer-control', className)}
        aria-label={props['aria-label'] || label}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        onBlur={(event) => {
          blur(event.currentTarget, event.relatedTarget);
          onBlur?.(event);
        }}
        onChange={(event) => {
          check(event.currentTarget);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          invalid(event.currentTarget);
          onInvalid?.(event);
        }}
      />
      {error && !props['aria-errormessage'] && (
        <p id={errorId} className="customer-field__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
});
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
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-errormessage'?: string;
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
  const control = Children.map(children, (child) =>
    isValidElement<ControlDescription>(child) &&
    (!htmlFor || child.props.id === htmlFor || Children.count(children) === 1)
      ? cloneElement(child, {
          'aria-describedby':
            [child.props['aria-describedby'], hasDescription ? descriptionId : undefined]
              .filter(Boolean)
              .join(' ') || undefined,
          'aria-invalid': error ? true : child.props['aria-invalid'],
          'aria-errormessage': error ? descriptionId : child.props['aria-errormessage'],
        })
      : child,
  );
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
