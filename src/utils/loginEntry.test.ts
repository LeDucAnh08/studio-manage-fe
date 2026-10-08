import { describe, expect, it } from 'vitest';
import { loginEntryForPath } from './loginEntry';

describe('login entry selection', () => {
  it('keeps expired customer sessions on the customer entry and staff sessions on the legacy entry', () => {
    for (const pathname of [
      '/login',
      '/register',
      '/portfolio',
      '/costumes',
      '/account/bookings/booking-1',
      '/booking/start',
      '/rental/start',
      '/feedback/customer-1',
      '/member-intake/token-1',
      '/form/customer-1',
      '/consultation',
    ]) {
      expect(loginEntryForPath(pathname)).toBe('/login');
    }
    for (const pathname of [
      '/',
      '/profile',
      '/manage/finance',
      '/workflow-bookings/booking-1',
      '/rental-orders/order-1',
      '/staff/login',
      '/staff-register',
      '/login-extra',
      '/feedback/customer-1/extra',
    ]) {
      expect(loginEntryForPath(pathname)).toBe('/staff/login');
    }
  });
});
