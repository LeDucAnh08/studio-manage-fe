import { forwardRef, type ComponentProps, type SelectHTMLAttributes } from 'react';
import {
  Button as LegacyButton,
  Input as LegacyInput,
  Textarea as LegacyTextarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useCustomerAppearance } from './CustomerAppearance';
import { CustomerButton } from './CustomerButton';
import { CustomerInput, CustomerSelect, CustomerTextarea } from './CustomerFields';
import '../../styles/customer-orders.css';

export const OrderButton = forwardRef<HTMLButtonElement, ComponentProps<typeof LegacyButton>>(
  ({ variant, size, className, ...props }, ref) => {
    const customer = useCustomerAppearance();
    if (!customer)
      return (
        <LegacyButton {...props} ref={ref} variant={variant} size={size} className={className} />
      );
    const customerVariant =
      variant === 'outline' || variant === 'secondary'
        ? 'secondary'
        : variant === 'ghost' || variant === 'link'
          ? 'text'
          : 'primary';
    return (
      <CustomerButton
        {...props}
        ref={ref}
        variant={customerVariant}
        className={cn(
          'customer-order-button',
          size === 'icon' && 'customer-order-button--icon',
          className,
        )}
      />
    );
  },
);
OrderButton.displayName = 'OrderButton';

export const OrderInput = forwardRef<HTMLInputElement, ComponentProps<typeof LegacyInput>>(
  (props, ref) =>
    useCustomerAppearance() ? (
      <CustomerInput {...props} ref={ref} />
    ) : (
      <LegacyInput {...props} ref={ref} />
    ),
);
OrderInput.displayName = 'OrderInput';

export const OrderTextarea = forwardRef<HTMLTextAreaElement, ComponentProps<typeof LegacyTextarea>>(
  (props, ref) =>
    useCustomerAppearance() ? (
      <CustomerTextarea {...props} ref={ref} />
    ) : (
      <LegacyTextarea {...props} ref={ref} />
    ),
);
OrderTextarea.displayName = 'OrderTextarea';

export const OrderSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) =>
    useCustomerAppearance() ? (
      <CustomerSelect {...props} ref={ref} />
    ) : (
      <select {...props} ref={ref} />
    ),
);
OrderSelect.displayName = 'OrderSelect';
