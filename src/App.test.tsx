import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from './types';
import App from './App';
const mocks = vi.hoisted(() => ({
  auth: { user: null as User | null, isBootstrapping: false, logout: vi.fn() },
  flags: { portal: true },
}));
vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ ...mocks.auth, isAuthenticated: !!mocks.auth.user }),
}));
vi.mock('./context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('./config/features', () => ({
  get clientPortalEnabled() {
    return mocks.flags.portal;
  },
}));
vi.mock('./config/navItems', () => ({ navItems: [], adminItems: [] }));
vi.mock('./pages/PortfolioPage', async () => {
  const { default: Layout } = await import('./components/Layout/PublicSiteLayout');
  return {
    default: () => (
      <Layout source="portfolio">
        <h1>Portfolio</h1>
      </Layout>
    ),
  };
});
vi.mock('./pages/PublicDiscoveryPage', async () => {
  const { default: Layout } = await import('./components/Layout/PublicSiteLayout');
  return {
    default: ({ page }: { page: string }) => (
      <Layout source={page}>
        <h1>{page}</h1>
      </Layout>
    ),
  };
});
vi.mock('./pages/CustomerOrdersPage', () => ({ default: () => <h1>Đơn của tôi</h1> }));
vi.mock('./pages/BookingWorkflowDetailPage', () => ({ default: () => <h1>Chi tiết chụp ảnh</h1> }));
vi.mock('./pages/RentalDetailPage', () => ({ default: () => <h1>Chi tiết thuê</h1> }));
vi.mock('./pages/LoginPage', () => ({
  default: function LoginProbe() {
    const location = useLocation();
    return (
      <>
        <h1>Đăng nhập</h1>
        <output data-testid="return-to">{location.state?.from}</output>
      </>
    );
  },
}));
vi.mock('./pages/BookingsPage', () => ({ NewBookingPage: () => <h1>Form đặt lịch</h1> }));
vi.mock('./pages/RentalCatalogPage', () => ({ default: () => <h1>Kho trang phục</h1> }));
vi.mock('./pages/ProfilePage', () => ({ default: () => <h1>Hồ sơ cá nhân</h1> }));
function open(path: string) {
  window.history.replaceState(null, '', path);
  return render(<App />);
}
function client() {
  mocks.auth.user = { roles: [6], username: 'client.test' } as User;
}
describe('Public discovery and customer workspace', () => {
  beforeEach(() => {
    mocks.auth.user = null;
    mocks.auth.isBootstrapping = false;
    mocks.flags.portal = true;
    window.scrollTo = vi.fn();
  });
  it('shows only portfolio entry controls without guest navigation and gates booking with its source', () => {
    open('/');
    const header = within(screen.getByRole('banner'));
    expect(header.queryByRole('navigation')).not.toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'Mở menu điều hướng' })).not.toBeInTheDocument();
    expect(header.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
    expect(header.getByRole('link', { name: /Yume Studio/ })).toHaveAttribute('href', '/portfolio');
    fireEvent.click(header.getByRole('link', { name: 'Đặt lịch' }));
    expect(screen.getByTestId('return-to')).toHaveTextContent('/booking/start?source=portfolio');
  });
  it.each(['/services', '/concepts', '/pricing'])('renders %s as its own public screen', (path) => {
    open(path);
    expect(window.location.pathname).toBe(path);
    expect(screen.getByRole('heading', { name: path.slice(1) })).toBeInTheDocument();
  });
  it.each(['/costumes', '/rental-catalog?type=ao-dai'])('allows guests to browse %s', (path) => {
    open(path);
    expect(screen.getByRole('heading', { name: 'Kho trang phục' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/costumes');
    if (path.includes('?')) expect(window.location.search).toBe('?type=ao-dai');
  });
  it.each([
    ['/portfolio#services', '/services', ''],
    ['/portfolio#gallery', '/account/orders', ''],
    ['/portfolio#packages', '/pricing', ''],
    ['/portfolio#process', '/services', '#process'],
    ['/consultation', '/services', ''],
  ])('resolves legacy %s before the signed-in portfolio redirect', (from, path, hash) => {
    client();
    open(from);
    expect(window.location.pathname).toBe(path);
    expect(window.location.hash).toBe(hash);
  });
  it.each(['/portfolio', '/account', '/account/orders'])('opens the workspace from %s', (path) => {
    client();
    open(path);
    expect(window.location.pathname).toBe('/account/orders');
    expect(screen.getByRole('heading', { name: 'Đơn của tôi' })).toBeInTheDocument();
  });
  it.each([
    ['/account/bookings', '?tab=bookings'],
    ['/account/rentals', '?tab=rentals'],
  ])('redirects legacy list %s', (path, search) => {
    client();
    open(path);
    expect(window.location.pathname).toBe('/account/orders');
    expect(window.location.search).toBe(search);
  });
  it('has a single orders menu and an accessible account dropdown', async () => {
    client();
    open('/concepts');
    expect(window.location.pathname).toBe('/account/orders');
    const header = within(screen.getByRole('banner'));
    const nav = within(header.getByRole('navigation', { name: 'Tài khoản khách hàng' }));
    expect(nav.queryByRole('link', { name: 'Concept' })).not.toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Đơn của tôi' })).toHaveAttribute(
      'href',
      '/account/orders',
    );
    expect(nav.queryByRole('link', { name: 'Đơn thuê của tôi' })).not.toBeInTheDocument();
    expect(header.getByRole('link', { name: /Yume Studio/ })).toHaveAttribute(
      'href',
      '/account/orders',
    );
    fireEvent.keyDown(header.getByRole('button', { name: 'Tài khoản' }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: 'Hồ sơ' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it.each([
    '/booking/start?source=pricing&package=p1&concept=Vintage#review',
    '/rental/start?item=c1#review',
  ])('preserves the full guest return target for %s', (path) => {
    open(path);
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByTestId('return-to').textContent).toBe(path);
  });
  it('moves authenticated booking into the account layout without losing context', () => {
    client();
    open('/booking/start?source=pricing&package=p1&concept=Vintage#review');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      '/account/bookings/new?source=pricing&package=p1&concept=Vintage#review',
    );
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Form đặt lịch' })).toBeInTheDocument();
  });
  it('waits for session validation on the portfolio', () => {
    client();
    mocks.auth.isBootstrapping = true;
    open('/portfolio');
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác thực');
    expect(window.location.pathname).toBe('/portfolio');
  });
  it('hides portal entry controls when disabled', () => {
    mocks.flags.portal = false;
    open('/portfolio');
    const header = within(screen.getByRole('banner'));
    expect(header.queryByRole('link', { name: 'Đặt lịch' })).not.toBeInTheDocument();
    expect(header.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });
  it.each(['/account/bookings/booking-1', '/account/rentals/rental-1'])(
    'keeps orders selected for detail %s',
    (path) => {
      client();
      open(path);
      const nav = within(screen.getByRole('navigation', { name: 'Tài khoản khách hàng' }));
      expect(nav.getByRole('link', { name: 'Đơn của tôi' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(nav.getByRole('link', { name: 'Đặt dịch vụ' })).not.toHaveAttribute('aria-current');
    },
  );
  it('hides disabled customer account entry for an existing client session', () => {
    client();
    mocks.flags.portal = false;
    open('/portfolio');
    const header = within(screen.getByRole('banner'));
    expect(header.queryByRole('button', { name: 'Tài khoản' })).not.toBeInTheDocument();
    expect(header.queryByRole('link', { name: 'Đặt lịch' })).not.toBeInTheDocument();
  });
});
