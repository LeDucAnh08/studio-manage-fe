/** Only allow return paths owned by the client portal or public booking wizard. */
export const safeBookingReturnTo = (candidate: unknown): string | undefined => {
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return undefined;
  }
  if (candidate.includes('\\') || /[\u0000-\u001f]/.test(candidate)) return undefined;

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    const isClientPath = url.pathname.startsWith('/account/');
    const isBookingWizard = url.pathname === '/booking/start';
    return isClientPath || isBookingWizard ? `${url.pathname}${url.search}${url.hash}` : undefined;
  } catch {
    return undefined;
  }
};
