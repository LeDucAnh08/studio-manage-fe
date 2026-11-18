import {
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';
import {
  controlLabel,
  customerControlError,
  type CustomerControl,
} from '@/utils/customerValidation';

export function useCustomerControl<T extends CustomerControl>(
  forwardedRef: ForwardedRef<T>,
  attributes: { 'aria-label'?: string },
  validation?: (value: string) => string | undefined,
) {
  const elementRef = useRef<T>(null);
  useImperativeHandle(forwardedRef, () => elementRef.current!, []);
  const touched = useRef(false);
  const [error, setError] = useState<string>();
  const [label, setLabel] = useState<string>();
  const errorId = useId();
  const check = useCallback(
    (element: T, reveal?: boolean) => {
      const message = customerControlError(element) || validation?.(element.value);
      element.setCustomValidity(message || '');
      if (reveal ?? touched.current) {
        touched.current = true;
        setError(message);
      }
      return message;
    },
    [validation],
  );
  useLayoutEffect(() => {
    if (elementRef.current) {
      setLabel(attributes['aria-label'] || controlLabel(elementRef.current, true));
      check(elementRef.current);
    }
  }, [attributes, check]);
  const invalid = (element: T) => {
    check(element, true);
    const first =
      element.form &&
      [...element.form.elements].find(
        (item) => 'validity' in item && !(item as HTMLInputElement).validity.valid,
      );
    if (!first || first === element) element.focus();
  };
  const blur = (element: T, next: EventTarget | null) => {
    // Keep a clicked action in place between pointer-down and pointer-up.
    check(element, !(next instanceof Element && next.closest('button, a')));
  };
  return { elementRef, error, label, errorId, check, invalid, blur };
}
