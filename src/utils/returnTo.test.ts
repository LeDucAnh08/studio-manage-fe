import { describe, expect, it } from 'vitest';
import { safeBookingReturnTo } from './returnTo';
describe('safe client return paths', () => {
  it('preserves the booking/rental context and account paths', () => {
    for (const target of [
      '/booking/start?package=123#review',
      '/rental/start?item=123',
      '/account/bookings/123',
    ])
      expect(safeBookingReturnTo(target)).toBe(target);
  });
  it('rejects external, protocol-relative, backslash and unrelated internal destinations', () => {
    for (const target of [
      'https://other.example/account/bookings',
      '//other.example/account/bookings',
      '/\\other.example/account/bookings',
      '/manage/finance',
      '/account-other',
      null,
    ])
      expect(safeBookingReturnTo(target)).toBeUndefined();
  });
  it('rejects raw control characters throughout an otherwise valid local destination', () => {
    for (const control of ['\u0000', '\n', '\r', '\t', '\u001f'])
      expect(safeBookingReturnTo('/account/bookings?draft=' + control)).toBeUndefined();
  });
});
