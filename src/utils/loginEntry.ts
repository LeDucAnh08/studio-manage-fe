const customerPaths = new Set([
  '/login',
  '/register',
  '/portfolio',
  '/costumes',
  '/account',
  '/booking/start',
  '/rental/start',
  '/feedback',
  '/services',
  '/concepts',
  '/pricing',
  '/consultation',
  '/rental-catalog',
]);

/** Selects the login presentation only; authorization and return validation stay separate. */
export function loginEntryForPath(pathname: string): '/login' | '/staff/login' {
  return customerPaths.has(pathname) ||
    pathname.startsWith('/account/') ||
    /^\/(?:form|member-intake|feedback)\/[^/]+$/.test(pathname)
    ? '/login'
    : '/staff/login';
}
