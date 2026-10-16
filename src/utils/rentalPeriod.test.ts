import { afterEach, describe, expect, it, vi } from 'vitest';
import { rentalDayCount, validateRentalPeriod, vietnamToday } from './rentalPeriod';

afterEach(() => vi.useRealTimers());

describe('rental calendar period', () => {
  it('counts both dates, validates leap days and caps the period at 366 calendar days', () => {
    expect(rentalDayCount('2028-02-29', '2028-02-29')).toBe(1);
    expect(rentalDayCount('2028-02-28', '2028-03-01')).toBe(3);
    expect(rentalDayCount('2027-02-29', '2027-03-01')).toBeNull();
    expect(rentalDayCount('2028-02-30', '2028-03-01')).toBeNull();
    expect(rentalDayCount('2028-2-01', '2028-03-01')).toBeNull();
    expect(rentalDayCount('2028-03-02', '2028-03-01')).toBeNull();
    expect(rentalDayCount('2028-01-01', '2028-12-31')).toBe(366);
    expect(rentalDayCount('2028-01-01', '2029-01-01')).toBeNull();
  });

  it('uses the Vietnam calendar day and rejects past or incomplete periods', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2028-02-28T18:00:00.000Z'));
    expect(vietnamToday()).toBe('2028-02-29');
    expect(validateRentalPeriod('2028-02-29', '2028-02-29')).toBe('');
    expect(validateRentalPeriod('2028-02-28', '2028-02-29')).toContain('hôm nay');
    expect(validateRentalPeriod('', '')).toContain('Chọn đủ');
    expect(validateRentalPeriod('2028-02-30', '2028-03-01')).toContain('không hợp lệ');
    expect(validateRentalPeriod('2028-03-02', '2028-03-01')).toContain('Ngày trả');
    expect(validateRentalPeriod('2028-03-01', '2029-03-02')).toContain('366');
  });
});
