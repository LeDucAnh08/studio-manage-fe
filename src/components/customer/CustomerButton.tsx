import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

interface CustomerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'text' | 'pill';
  fullWidth?: boolean;
}

export const CustomerButton = forwardRef<HTMLButtonElement, CustomerButtonProps>(
  (
    {
      asChild = false,
      variant = 'primary',
      fullWidth,
      className,
      disabled,
      onClickCapture,
      onKeyDownCapture,
      tabIndex,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : 'button';
    const child = props.children;
    // Slot prefers child props and runs child handlers first, so sanitize the
    // disabled child before it can handle capture events or override semantics.
    const content =
      asChild && disabled && isValidElement<HTMLAttributes<HTMLElement>>(child)
        ? cloneElement(child, {
            'aria-disabled': true,
            tabIndex: -1,
            onClickCapture: (event) => {
              event.preventDefault();
              event.stopPropagation();
            },
            onKeyDownCapture: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              child.props.onKeyDownCapture?.(event);
            },
          })
        : child;
    return (
      <Component
        {...props}
        ref={ref}
        disabled={asChild ? undefined : disabled}
        aria-disabled={asChild && disabled ? true : props['aria-disabled']}
        tabIndex={asChild && disabled ? -1 : tabIndex}
        onClickCapture={(event) => {
          if (asChild && disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClickCapture?.(event);
        }}
        onKeyDownCapture={(event) => {
          if (asChild && disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onKeyDownCapture?.(event);
        }}
        className={cn(
          'customer-button',
          variant !== 'primary' && `customer-button--${variant}`,
          fullWidth && 'customer-button--full',
          className,
        )}
      >
        {content}
      </Component>
    );
  },
);
CustomerButton.displayName = 'CustomerButton';
