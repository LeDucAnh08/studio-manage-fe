import { describe, expect, it } from 'vitest';
import { getNavigationBreadcrumbs, getNavigationGroupForPath } from './navigation';

describe('navigation helpers', () => {
  it('resolves static paths to the configured breadcrumb labels', () => {
    expect(getNavigationBreadcrumbs('/manage/finance')).toEqual([
      { label: 'Quản lý' },
      { label: 'Tài chính' },
    ]);
  });

  it('resolves a customer detail route from the hidden configured route', () => {
    expect(getNavigationBreadcrumbs('/customers/class-123')).toEqual([
      { label: 'Khách hàng', to: '/customers' },
      { label: 'Chi tiết khách hàng' },
    ]);
    expect(getNavigationGroupForPath('/customers/class-123')).toBe('/customers');
  });

  it('prefers a static customer child route over the :id route', () => {
    expect(getNavigationBreadcrumbs('/customers/size')).toEqual([
      { label: 'Khách hàng', to: '/customers' },
      { label: 'Thông tin học sinh' },
    ]);
    expect(getNavigationGroupForPath('/customers/size')).toBe('/customers');
  });

  it('does not create admin breadcrumbs for unmatched client portal routes', () => {
    expect(getNavigationBreadcrumbs('/account/bookings')).toEqual([]);
    expect(getNavigationGroupForPath('/account/bookings')).toBeNull();
  });
});
