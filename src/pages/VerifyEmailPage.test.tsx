import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyEmailPage from './VerifyEmailPage';
import LoginPage from './LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  updateUser: vi.fn(),
  login: vi.fn(),
  auth: { authenticated: true },
}));
vi.mock('../services/emailService', () => ({
  emailService: { confirm: mocks.confirm },
  emailError: () => 'Đường dẫn đã hết hạn hoặc không thuộc tài khoản.',
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mocks.auth.authenticated,
    isBootstrapping: false,
    user: mocks.auth.authenticated
      ? { _id: 'client', username: 'mango', roles: [6], email: 'client@example.test' }
      : null,
    updateUser: mocks.updateUser,
    login: mocks.login,
  }),
}));
function Probe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.hash}</output>;
}
const token = 'a'.repeat(64);
function open() {
  return render(
    <MemoryRouter initialEntries={[`/account/verify-email#token=${token}`]}>
      <Probe />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/account/verify-email"
          element={
            <ProtectedRoute allowedRoles={[6]}>
              <VerifyEmailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}
describe('Email verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.authenticated = true;
    mocks.confirm.mockResolvedValue({
      email: 'client@example.test',
      emailVerifiedAt: '2026-11-05T00:00:00Z',
    });
  });
  it('waits for explicit confirmation, updates account state and removes the token after success', async () => {
    open();
    expect(mocks.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
    expect(await screen.findByText(/Email đã được xác minh\. Bạn sẽ nhận/)).toBeInTheDocument();
    expect(mocks.confirm).toHaveBeenCalledWith(token);
    expect(mocks.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerifiedAt: expect.any(String) }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/account\/verify-email$/);
    expect(screen.getByRole('link', { name: 'Xem đơn chụp ảnh' })).toHaveAttribute(
      'href',
      '/account/orders?tab=bookings',
    );
  });
  it('resumes the exact verification link after login without putting the token in an API GET', async () => {
    mocks.auth.authenticated = false;
    mocks.login.mockImplementation(async () => {
      mocks.auth.authenticated = true;
      return { roles: [6] };
    });
    open();
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tên đăng nhập'), { target: { value: 'mango' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByRole('heading', { name: 'Xác minh email nhận thông báo' });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent(`#token=${token}`);
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(token));
  });
  it('keeps failed verification actionable without marking the email verified', async () => {
    mocks.confirm.mockRejectedValue(new Error('invalid_token'));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Đường dẫn đã hết hạn');
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Hồ sơ cá nhân' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
  });
});
