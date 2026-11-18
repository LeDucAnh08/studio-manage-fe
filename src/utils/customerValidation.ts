export const normalizePhone = (value: string) => value.trim().replace(/[ ().-]/g, '');
export const validatePhone = (value: string, required = true) => {
  if (!value.trim()) return required ? 'Vui lòng nhập số điện thoại.' : undefined;
  return value.length <= 25 && /^(?:0[1-9]\d{8}|\+84[1-9]\d{8})$/.test(normalizePhone(value))
    ? undefined
    : 'Nhập số điện thoại 10 chữ số bắt đầu bằng 0 hoặc dạng +84 (ví dụ: 0901234567).';
};
export const validateEmail = (value: string, required = false) => {
  if (!value.trim()) return required ? 'Vui lòng nhập email.' : undefined;
  const email = value.trim().toLowerCase();
  return email.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) &&
    !email.includes('..') &&
    !email.startsWith('.') &&
    !email.includes('.@')
    ? undefined
    : 'Nhập địa chỉ email hợp lệ (ví dụ: ten@gmail.com), tối đa 254 ký tự.';
};
export const validatePassword = (value: string) =>
  !value
    ? 'Vui lòng nhập mật khẩu.'
    : value.length < 8
      ? 'Mật khẩu phải có ít nhất 8 ký tự.'
      : new TextEncoder().encode(value).length > 72
        ? 'Mật khẩu tối đa 72 byte; ký tự có dấu có thể chiếm nhiều byte.'
        : undefined;
export const validateText = (value: string, label: string, max: number, required = true) =>
  required && !value.trim()
    ? `Vui lòng nhập ${label.toLocaleLowerCase('vi')}.`
    : value.length > max
      ? `${label} tối đa ${max.toLocaleString('vi-VN')} ký tự.`
      : undefined;
export function validateReferences(value: string) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 10) return 'Tối đa 10 link ảnh mẫu, mỗi dòng một link HTTPS.';
  for (const [index, line] of lines.entries()) {
    try {
      const url = new URL(line);
      if (
        line.length > 1000 ||
        url.protocol !== 'https:' ||
        !url.hostname ||
        url.username ||
        url.password
      )
        throw new Error();
    } catch {
      return `Link ảnh mẫu dòng ${index + 1} phải là URL HTTPS hợp lệ, tối đa 1.000 ký tự và không chứa thông tin đăng nhập.`;
    }
  }
}
export type CustomerControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export function controlLabel(control: CustomerControl, ignoreAriaLabel = false) {
  const label = control.labels?.[0];
  return (
    (!ignoreAriaLabel && control.getAttribute('aria-label')) ||
    (label &&
      [...label.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent)
        .join(' ')
        .replace(/\*/g, '')
        .trim()) ||
    control.name ||
    'Thông tin'
  );
}
export function customerControlError(control: CustomerControl): string | undefined {
  if (
    control.disabled ||
    ('readOnly' in control && control.readOnly) ||
    ['hidden', 'button', 'submit', 'reset', 'range', 'file'].includes(control.type)
  )
    return;
  const label = controlLabel(control);
  const required = control.required || control.getAttribute('aria-required') === 'true';
  const value = control.value;
  if (control.type === 'checkbox' || control.type === 'radio')
    return required && control.validity.valueMissing
      ? `Vui lòng chọn ${label.toLocaleLowerCase('vi')}.`
      : undefined;
  if (control.validity.badInput) return `${label}: vui lòng nhập số hợp lệ.`;
  if (!value.trim())
    return required
      ? `Vui lòng ${control.tagName === 'SELECT' || ['date', 'time', 'datetime-local'].includes(control.type) ? 'chọn' : 'nhập'} ${label.toLocaleLowerCase('vi')}.`
      : undefined;
  if ('maxLength' in control && control.maxLength >= 0 && value.length > control.maxLength)
    return `${label} tối đa ${control.maxLength.toLocaleString('vi-VN')} ký tự.`;
  if ('minLength' in control && control.minLength > 0 && value.length < control.minLength)
    return `${label} cần ít nhất ${control.minLength} ký tự.`;
  if (control.type === 'email') return validateEmail(value, required);
  if (control.type === 'tel') return validatePhone(value, required);
  if (control.autocomplete === 'new-password') return validatePassword(value);
  if (control.getAttribute('data-validation') === 'https-lines') return validateReferences(value);
  if (control.validity.typeMismatch) return `${label}: vui lòng nhập đường dẫn hợp lệ.`;
  if (control.validity.patternMismatch)
    return control.getAttribute('title') || `${label} chưa đúng định dạng yêu cầu.`;
  if (control instanceof HTMLInputElement) {
    if (control.min && control.validity.rangeUnderflow)
      return `${label} phải từ ${control.min} trở lên.`;
    if (control.max && control.validity.rangeOverflow)
      return `${label} không được lớn hơn ${control.max}.`;
    if (control.validity.stepMismatch)
      return `${label}: ${control.step === '1' || !control.step ? 'vui lòng nhập số nguyên.' : `chỉ nhận bước ${control.step}.`}`;
  }
}
/** Also validates restored drafts and JS-driven Next/Save actions without a native form submit. */
export function validateCustomerContainer(container: HTMLElement | null) {
  if (!container) return true;
  const controls = [...container.querySelectorAll<CustomerControl>('input, textarea, select')];
  for (const control of controls)
    if (!control.hasAttribute('data-customer-control'))
      control.setCustomValidity(customerControlError(control) || '');
  const invalid = controls.filter((control) => !control.checkValidity());
  invalid[0]?.focus();
  return !invalid.length;
}
