import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../types';
import ClientLayout from '../Layout/ClientLayout';
import PublicSiteLayout from '../Layout/PublicSiteLayout';
import { CustomerAccountTabs } from './CustomerAccountTabs';
import { CustomerHeader } from './CustomerHeader';
import SharedCustomerHeader from '../Layout/CustomerHeader';

const mocks = vi.hoisted(() => ({
  auth: { user: null as User | null, isAuthenticated: false, logout: vi.fn() },
  flags: { portal: true },
  notifications: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../../services/bookingService', () => ({
  bookingService: { notifications: mocks.notifications },
}));

vi.mock('../../config/features', () => ({
  get clientPortalEnabled() {
    return mocks.flags.portal;
  },
}));

function LocationProbe() {
  const { pathname, hash, search, state } = useLocation();
  return (
    <output data-testid="location">{JSON.stringify({ pathname, hash, search, state })}</output>
  );
}

function renderHeader(pathname = '/portfolio', source?: 'portfolio' | 'costumes' | 'account') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <CustomerHeader source={source} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const primaryLabels = ['Khám phá dịch vụ', 'Trang phục', 'Dịch vụ của tôi'];
const desktopNav = () => screen.getByRole('navigation', { name: 'Điều hướng chính' });
const navLabels = (navigation: HTMLElement) =>
  within(navigation)
    .getAllByRole('link')
    .map((link) => link.textContent?.trim());

describe('Customer shared navigation', () => {
  beforeEach(() => {
    mocks.auth.user = {
      _id: 'customer-1',
      username: 'linh',
      name: 'Linh Nguyễn',
      roles: [6],
      isActive: true,
    };
    mocks.auth.isAuthenticated = true;
    mocks.flags.portal = true;
    mocks.notifications.mockReset().mockResolvedValue([]);
  });

  it.each([
    '/portfolio',
    '/costumes',
    '/account/bookings/new',
    '/account/orders',
    '/account/profile',
  ])(
    'keeps notifications next to the account control for a signed-in customer at %s',
    async (pathname) => {
      render(
        <MemoryRouter initialEntries={[pathname]}>
          <SharedCustomerHeader />
        </MemoryRouter>,
      );
      const account = screen.getByRole('button', { name: 'Tài khoản' });
      const bell = screen.getByRole('button', { name: 'Thông báo' });
      expect(bell.nextElementSibling).toBe(account);
      await waitFor(() => expect(mocks.notifications).toHaveBeenCalledTimes(1));
    },
  );

  it('does not show or load customer notifications before login', () => {
    mocks.auth.user = null;
    mocks.auth.isAuthenticated = false;
    render(
      <MemoryRouter initialEntries={['/portfolio']}>
        <SharedCustomerHeader />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /Thông báo/ })).not.toBeInTheDocument();
    expect(mocks.notifications).not.toHaveBeenCalled();
  });

  it.each(['public', 'account'] as const)(
    'keeps the same primary link order in the %s layout',
    (layout) => {
      render(
        <MemoryRouter initialEntries={[layout === 'public' ? '/portfolio' : '/account/bookings']}>
          <Routes>
            <Route
              element={
                layout === 'public' ? (
                  <PublicSiteLayout source="portfolio">
                    <Outlet />
                  </PublicSiteLayout>
                ) : (
                  <ClientLayout />
                )
              }
            >
              <Route path="*" element={<p>Nội dung trang</p>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      const navigation = screen.getByRole('navigation', { name: 'Tài khoản khách hàng' });
      expect(navLabels(navigation)).toEqual(['Đặt dịch vụ', 'Trang phục', 'Đơn của tôi']);
      expect(within(navigation).getByRole('link', { name: 'Đặt dịch vụ' })).toHaveAttribute(
        'href',
        '/account/bookings/new',
      );
      expect(within(navigation).getByRole('link', { name: 'Trang phục' })).toHaveAttribute(
        'href',
        '/costumes',
      );
      expect(within(navigation).getByRole('link', { name: 'Đơn của tôi' })).toHaveAttribute(
        'href',
        '/account/orders',
      );
    },
  );

  it('retains all primary links and updates the active item when moving between services and discovery', () => {
    renderHeader('/account/bookings/booking-1', 'account');
    expect(within(desktopNav()).getByRole('link', { name: 'Dịch vụ của tôi' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(within(desktopNav()).getByRole('link', { name: 'Khám phá dịch vụ' }));
    expect(navLabels(desktopNav())).toEqual(primaryLabels);
    expect(within(desktopNav()).getByRole('link', { name: 'Khám phá dịch vụ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(desktopNav()).getByRole('link', { name: 'Dịch vụ của tôi' })).not.toHaveAttribute(
      'aria-current',
    );

    fireEvent.click(within(desktopNav()).getByRole('link', { name: 'Trang phục' }));
    expect(navLabels(desktopNav())).toEqual(primaryLabels);
    expect(within(desktopNav()).getByRole('link', { name: 'Trang phục' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(desktopNav())
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1);
  });

  it.each([
    ['/portfolio#gallery', 'Khám phá dịch vụ'],
    ['/rental/start', 'Trang phục'],
    ['/account/rentals/rental-1', 'Dịch vụ của tôi'],
  ])('keeps the matching section active at %s', (pathname, label) => {
    renderHeader(pathname);
    expect(within(desktopNav()).getByRole('link', { name: label })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('leaves primary sections inactive on the customer profile', () => {
    renderHeader('/account/profile', 'account');
    expect(
      within(desktopNav())
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(0);
  });

  it('takes guests to login with the intended services destination', () => {
    mocks.auth.user = null;
    mocks.auth.isAuthenticated = false;
    renderHeader();
    fireEvent.click(within(desktopNav()).getByRole('link', { name: 'Dịch vụ của tôi' }));
    expect(JSON.parse(screen.getByTestId('location').textContent || '{}')).toMatchObject({
      pathname: '/login',
      state: { from: '/account/bookings' },
    });
  });

  it('keeps staff account access directed to their profile', () => {
    mocks.auth.user = { ...mocks.auth.user!, roles: [2] };
    renderHeader();
    expect(within(desktopNav()).getByRole('link', { name: 'Tài khoản' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      within(desktopNav()).queryByRole('link', { name: 'Dịch vụ của tôi' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['portfolio', '/portfolio', '/booking/start?source=portfolio'],
    [
      'costumes',
      '/costumes?receiveDate=2098-04-10&returnDate=2098-04-12',
      '/booking/start?source=costumes',
    ],
    ['account', '/account/bookings', '/booking/start?source=account'],
  ] as const)(
    'keeps the explicit photography booking entry point for %s',
    (source, pathname, href) => {
      renderHeader(pathname, source);
      expect(screen.getByRole('link', { name: 'Đặt lịch chụp' })).toHaveAttribute('href', href);
      expect(screen.queryByRole('link', { name: /^Đặt lịch$/ })).not.toBeInTheDocument();
      expect(navLabels(desktopNav())).toEqual(primaryLabels);

      fireEvent.click(screen.getByRole('link', { name: 'Đặt lịch chụp' }));
      expect(JSON.parse(screen.getByTestId('location').textContent || '{}')).toMatchObject({
        pathname: '/booking/start',
        search: `?source=${source}`,
      });
    },
  );

  it('takes the account footer booking link to the shared booking entry', () => {
    render(
      <MemoryRouter initialEntries={['/account/bookings']}>
        <ClientLayout />
        <LocationProbe />
      </MemoryRouter>,
    );
    const footer = screen.getByRole('navigation', { name: 'Khám phá và đặt dịch vụ' });
    const booking = within(footer).getByRole('link', { name: 'Đặt dịch vụ' });
    expect(booking).toHaveAttribute('href', '/account/bookings/new');

    fireEvent.click(booking);
    expect(JSON.parse(screen.getByTestId('location').textContent || '{}')).toMatchObject({
      pathname: '/account/bookings/new',
      search: '',
    });
  });

  it('uses consultation without unavailable account routes when the portal is disabled', async () => {
    mocks.flags.portal = false;
    renderHeader();
    expect(screen.getByRole('link', { name: 'Nhận tư vấn' })).toHaveAttribute(
      'href',
      '/consultation',
    );
    expect(screen.queryByRole('link', { name: 'Đặt lịch chụp' })).not.toBeInTheDocument();
    expect(within(desktopNav()).getByRole('link', { name: 'Liên hệ studio' })).toHaveAttribute(
      'href',
      '/portfolio#contact',
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Tài khoản của Linh Nguyễn' }), {
      key: 'Enter',
    });
    const accountMenu = await screen.findByRole('menu');
    expect(within(accountMenu).queryByRole('menuitem', { name: 'Hồ sơ' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/profile"], a[href^="/account/"]')).toBeNull();
  });

  it('shows the same primary sections in the mobile menu and closes after navigation', async () => {
    renderHeader('/account/bookings', 'account');
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Điều hướng chính trên điện thoại' });
    expect(navLabels(mobileNav)).toEqual(primaryLabels);
    fireEvent.click(within(mobileNav).getByRole('link', { name: 'Khám phá dịch vụ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId('location').textContent || '{}')).toMatchObject({
      pathname: '/portfolio',
      hash: '#packages',
    });
  });

  it('closes the mobile menu after signing out while already on the portfolio', async () => {
    renderHeader('/portfolio');
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    const menu = screen.getByRole('dialog');
    fireEvent.click(within(menu).getByRole('button', { name: 'Đăng xuất' }));

    expect(mocks.auth.logout).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId('location').textContent || '{}')).toMatchObject({
      pathname: '/portfolio',
    });
  });

  it('opens the account menu with the keyboard, restores focus after Escape, and signs out', async () => {
    renderHeader('/account/bookings', 'account');
    const trigger = screen.getByRole('button', { name: 'Tài khoản của Linh Nguyễn' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: 'Hồ sơ' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Đăng xuất' }));
    expect(mocks.auth.logout).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId('location').textContent || '{}')).toMatchObject({
      pathname: '/portfolio',
    });
  });
});

describe('Customer account section tabs', () => {
  beforeEach(() => {
    mocks.flags.portal = true;
  });

  it('marks the rental tab on a rental detail without replacing the primary navigation', () => {
    render(
      <MemoryRouter initialEntries={['/account/rentals/rental-1']}>
        <CustomerAccountTabs />
      </MemoryRouter>,
    );
    const tabs = screen.getByRole('navigation', { name: 'Loại dịch vụ của tôi' });
    expect(navLabels(tabs)).toEqual(['Chụp ảnh', 'Đơn thuê']);
    expect(within(tabs).getByRole('link', { name: 'Đơn thuê' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabs).getByRole('link', { name: 'Chụp ảnh' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('hides rental access when the customer portal is disabled', () => {
    mocks.flags.portal = false;
    render(
      <MemoryRouter initialEntries={['/account/bookings']}>
        <CustomerAccountTabs />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Chụp ảnh' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Đơn thuê' })).not.toBeInTheDocument();
  });
});
