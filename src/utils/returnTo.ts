/** Only allow known customer screens; never external URLs or staff destinations. */
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
    const isCustomerScreen =
      [
        '/services',
        '/pricing',
        '/costumes',
        '/rental-catalog',
        '/feedback',
        '/consultation',
      ].includes(url.pathname) ||
      /^\/(?:pricing|photographers|form|feedback|member-intake|albums|concept-albums)\/[A-Za-z0-9_-]+$/.test(
        url.pathname,
      );
    return isClientPath || isBookingWizard || isCustomerScreen
      ? `${url.pathname}${url.search}${url.hash}`
      : undefined;
  } catch {
    return undefined;
  }
};
