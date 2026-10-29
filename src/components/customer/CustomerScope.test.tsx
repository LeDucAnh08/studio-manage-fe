import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRole } from '../../types';
import ProtectedRoute from '../ProtectedRoute';
import { useCustomerAppearance } from './CustomerAppearance';
import CustomerScope from './CustomerScope';
import CustomerToastContainer from './CustomerToastContainer';

const mocks = vi.hoisted(() => ({
  auth: { isBootstrapping: true, isAuthenticated: true, user: { roles: [6] } },
  flags: { portal: true },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../../config/features', () => ({
  get clientPortalEnabled() {
    return mocks.flags.portal;
  },
}));

function AuthSurface({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const customer = useCustomerAppearance();
  return (
    <section aria-label={customer ? 'Customer authentication' : 'Staff authentication'}>
      <ProtectedRoute allowedRoles={allowedRoles}>
        <p>Protected content</p>
      </ProtectedRoute>
    </section>
  );
}

function GuardRoutes({ pathname }: { pathname: string }) {
  return (
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<CustomerScope />}>
          <Route path="/account/bookings" element={<AuthSurface allowedRoles={[6]} />} />
        </Route>
        <Route path="/profile" element={<AuthSurface allowedRoles={[0]} />} />
        <Route path="/" element={<AuthSurface allowedRoles={[0]} />} />
        <Route path="/login" element={<p>Customer login destination</p>} />
        <Route path="/staff/login" element={<p>Staff login destination</p>} />
        <Route path="/portfolio" element={<p>Public portfolio destination</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function ToastNavigation() {
  const { pathname } = useLocation();
  return (
    <>
      <p data-testid="current-path">{pathname}</p>
      <Link to="/profile">Staff profile</Link>
      <button
        type="button"
        onClick={() => toast.success('Notification at ' + pathname, { autoClose: false })}
      >
        Notify
      </button>
      <CustomerToastContainer />
    </>
  );
}

function renderToastSurface(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <ToastNavigation />
    </MemoryRouter>,
  );
}

describe('Customer route appearance', () => {
  beforeEach(() => {
    mocks.auth.isBootstrapping = true;
    mocks.auth.isAuthenticated = true;
    mocks.auth.user.roles = [6];
    mocks.flags.portal = true;
    document.documentElement.classList.add('dark');
    localStorage.setItem('themeMode', 'dark');
  });

  afterEach(() => {
    cleanup();
    toast.dismiss();
    toast.clearWaitingQueue();
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('themeMode');
  });

  it('scopes the customer auth bootstrap while keeping the staff boundary and theme unchanged', () => {
    const customer = render(<GuardRoutes pathname="/account/bookings" />);
    const customerBoundary = screen.getByRole('region', { name: 'Customer authentication' });
    expect(within(customerBoundary).getByText('Đang xác thực...')).toBeInTheDocument();
    expect(customerBoundary.closest('.customer-ui')).not.toBeNull();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');

    mocks.auth.isBootstrapping = false;
    customer.rerender(<GuardRoutes pathname="/account/bookings" />);
    expect(within(customerBoundary).getByText('Protected content')).toBeInTheDocument();
    customer.unmount();

    mocks.auth.isBootstrapping = true;
    mocks.auth.user.roles = [0];
    render(<GuardRoutes pathname="/profile" />);
    const staffBoundary = screen.getByRole('region', { name: 'Staff authentication' });
    expect(within(staffBoundary).getByText('Đang xác thực...')).toBeInTheDocument();
    expect(staffBoundary.closest('.customer-ui')).toBeNull();
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');
  });

  it('keeps one toast container and preserves each toast appearance across customer-to-staff navigation', async () => {
    renderToastSurface('/register');
    const container = document.querySelector('section.Toastify');
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    const customerToast = (await screen.findByText('Notification at /register')).closest(
      '.Toastify__toast',
    );
    expect(customerToast).toHaveClass('Toastify__toast', 'customer-toast', 'customer-tokens');
    expect(customerToast).toHaveAttribute('role', 'alert');

    fireEvent.click(screen.getByRole('link', { name: 'Staff profile' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/profile');
    expect(document.querySelectorAll('section.Toastify')).toHaveLength(1);
    expect(document.querySelector('section.Toastify')).toBe(container);
    expect(customerToast).toHaveClass('customer-toast', 'customer-tokens');

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    const staffToast = (await screen.findByText('Notification at /profile')).closest(
      '.Toastify__toast',
    );
    expect(staffToast).toHaveClass('Toastify__toast', 'Toastify__toast-theme--light');
    expect(staffToast).not.toHaveClass('customer-toast', 'customer-tokens');
    expect(customerToast).toHaveClass('customer-toast', 'customer-tokens');
    expect(document.querySelectorAll('section.Toastify')).toHaveLength(1);
  });

  it.each([
    { pathname: '/register', portal: false },
    { pathname: '/account/rentals', portal: false },
    { pathname: '/account/unexpected', portal: true },
    { pathname: '/staff/login', portal: true },
  ])('retains default toast appearance at $pathname with its route gates', async (entry) => {
    mocks.flags.portal = entry.portal;
    renderToastSurface(entry.pathname);
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    const renderedToast = (await screen.findByText('Notification at ' + entry.pathname)).closest(
      '.Toastify__toast',
    );
    expect(renderedToast).toHaveAttribute('role', 'alert');
    expect(renderedToast).toHaveClass('Toastify__toast-theme--light');
    expect(renderedToast).not.toHaveClass('customer-toast', 'customer-tokens');
  });

  it.each([true, false])(
    'uses customer login toasts independently of portal flag %s',
    async (portal) => {
      mocks.flags.portal = portal;
      renderToastSurface('/login');
      fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
      const renderedToast = (await screen.findByText('Notification at /login')).closest(
        '.Toastify__toast',
      );
      expect(renderedToast).toHaveClass('customer-toast', 'customer-tokens');
    },
  );

  it.each([{ portal: true }, { portal: false }])(
    'uses customer toasts on the public rental form with flags %s',
    async (flags) => {
      mocks.flags.portal = flags.portal;
      renderToastSurface('/rental/start');
      fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
      const renderedToast = (await screen.findByText('Notification at /rental/start')).closest(
        '.Toastify__toast',
      );
      expect(renderedToast).toHaveClass('customer-toast', 'customer-tokens');
      expect(renderedToast).toHaveAttribute('role', 'alert');
    },
  );

  it.each([
    ['/account/bookings?source=portfolio', 'Customer login destination'],
    ['/profile', 'Staff login destination'],
    ['/', 'Public portfolio destination'],
  ])('keeps the correct guest destination for %s', async (pathname, destination) => {
    mocks.auth.isBootstrapping = false;
    mocks.auth.isAuthenticated = false;
    render(<GuardRoutes pathname={pathname} />);
    expect(await screen.findByText(destination)).toBeInTheDocument();
  });
});
