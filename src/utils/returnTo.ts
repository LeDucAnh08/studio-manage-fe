/** Only allow return paths owned by the client portal or public booking wizard. */
export const safeBookingReturnTo = (candidate: unknown): string | undefined => {
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return undefined;
  }
  if (candidate.includes('\\') || Array.from(candidate).some((char) => char.charCodeAt(0) < 32))
    return undefined;

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    const isClientPath = url.pathname.startsWith('/account/');
    const isBookingWizard =
      url.pathname === '/booking/start' ||
      url.pathname === '/rental/start' ||
      url.pathname === '/concept-booking' ||
      /^\/concept-booking\/packages\/[A-Za-z0-9-]+(?:\/book\/(?:date|photographer|costumes|brief|review)|\/photographers\/[A-Za-z0-9-]+)?$/.test(
        url.pathname,
      ) ||
      url.pathname === '/concepts';
    return isClientPath || isBookingWizard ? `${url.pathname}${url.search}${url.hash}` : undefined;
  } catch {
    return undefined;
  }
};
