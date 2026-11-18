import { describe, expect, it } from 'vitest';
import { getNavigationBreadcrumbs, getNavigationGroupForPath } from './navigation';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createElement } from 'react';
import { LegacyUsersRedirect } from '../pages/UsersPage';
import { navItems } from './navItems';

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
      { label: 'Chi tiết lớp học' },
    ]);
    expect(getNavigationGroupForPath('/customers/class-123')).toBe('/customers');
  });

  it('prefers a static customer child route over the :id route', () => {
    expect(getNavigationBreadcrumbs('/customers/size')).toEqual([
      { label: 'Khách hàng', to: '/customers' },
      { label: 'Danh sách lớp học' },
    ]);
    expect(getNavigationGroupForPath('/customers/size')).toBe('/customers');
  });

  it('does not create admin breadcrumbs for unmatched client portal routes', () => {
    expect(getNavigationBreadcrumbs('/account/bookings')).toEqual([]);
    expect(getNavigationGroupForPath('/account/bookings')).toBeNull();
  });
  it('resolves user management inside Customers before the class detail route', () => {
    expect(getNavigationBreadcrumbs('/customers/users')).toEqual([
      { label: 'Khách hàng', to: '/customers' },
      { label: 'Người dùng' },
    ]);
    expect(getNavigationGroupForPath('/customers/users')).toBe('/customers');
    expect(
      navItems
        .find((item) => item.to === '/customers')
        ?.children?.find((item) => item.to === '/users')?.allowedRoles,
    ).toEqual([0, 1]);
  });
  it('redirects the old user URL without losing query, hash or navigation state', () => {
    function Destination() {
      const location = useLocation();
      return createElement(
        'output',
        { 'data-testid': 'users-route' },
        location.pathname + location.search + location.hash + JSON.stringify(location.state),
      );
    }
    render(
      createElement(
        MemoryRouter,
        {
          initialEntries: [
            {
              pathname: '/manage/users',
              search: '?page=2',
              hash: '#accounts',
              state: { from: 'dashboard' },
            },
          ],
        },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/manage/users',
            element: createElement(LegacyUsersRedirect),
          }),
          createElement(Route, { path: '/customers/users', element: createElement(Destination) }),
        ),
      ),
    );
    expect(screen.getByTestId('users-route')).toHaveTextContent(
      '/customers/users?page=2#accounts{"from":"dashboard"}',
    );
  });
});
