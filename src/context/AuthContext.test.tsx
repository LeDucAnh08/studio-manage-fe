import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { authService } from '../services/authService';
import { endSession } from '../services/authSession';
import type { User } from '../types';

vi.mock('../services/authService', () => ({
  authService: { refresh: vi.fn(), login: vi.fn(), getMe: vi.fn() },
}));
const user = { _id: 'client-one', username: 'customer', roles: [6], name: 'Khách' } as User;
const token = (seconds = 3600) =>
  `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds }))}.signature`;
function Login() {
  const location = useLocation();
  return <h1>Đăng nhập {location.state?.from}</h1>;
}
function Probe() {
  const auth = useAuth();
  return (
    <>
      <output>{auth.user ? auth.user.name : 'Chưa đăng nhập'}</output>
      <button onClick={auth.logout}>Đăng xuất</button>
      <button onClick={() => void auth.login('customer', 'password')}>Đăng nhập thử</button>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/account/orders"
          element={
            <ProtectedRoute>
              <h1>Nội dung riêng</h1>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
function open() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/account/orders?page=2#selected']}>
        <Probe />
      </MemoryRouter>
    </AuthProvider>,
  );
}
describe('Session lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(authService.refresh).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });
  it('never trusts an orphan stored user without a token', () => {
    localStorage.setItem('user', JSON.stringify(user));
    open();
    expect(screen.getByRole('heading', { name: /Đăng nhập/ })).toBeInTheDocument();
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument();
    expect(authService.refresh).not.toHaveBeenCalled();
    expect(localStorage.getItem('user')).toBeNull();
  });
  it('rejects an expired stored token before mounting protected content', () => {
    localStorage.setItem('token', token(-10));
    open();
    expect(screen.getByRole('heading')).toHaveTextContent('Đăng nhập');
    expect(authService.refresh).not.toHaveBeenCalled();
  });
  it('waits for the server, then locks an open page exactly when its session expires', async () => {
    vi.useFakeTimers();
    localStorage.setItem('token', token());
    sessionStorage.setItem('retained-draft', 'customer-input');
    let resolve!: (value: { user: User; token: string }) => void;
    vi.mocked(authService.refresh).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    open();
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument();
    await act(async () => resolve({ user, token: token(5) }));
    expect(screen.getByText('Nội dung riêng')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('/account/orders?page=2#selected');
    expect(screen.getByText('Chưa đăng nhập')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('retained-draft')).toBe('customer-input');
  });
  it.each(['api', 'storage'])(
    'unmounts content and clears the navbar user on %s invalidation',
    async (cause) => {
      localStorage.setItem('token', token());
      vi.mocked(authService.refresh).mockResolvedValue({ user, token: token() });
      open();
      expect(await screen.findByText('Nội dung riêng')).toBeInTheDocument();
      act(() => {
        if (cause === 'api') endSession();
        else {
          localStorage.removeItem('token');
          window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: null }));
        }
      });
      expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument();
      expect(screen.getByText('Chưa đăng nhập')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toHaveTextContent('Đăng nhập');
    },
  );
  it('does not restore a delayed bootstrap response after logout', async () => {
    localStorage.setItem('token', token());
    let resolve!: (value: { user: User; token: string }) => void;
    vi.mocked(authService.refresh).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await act(async () => resolve({ user, token: token() }));
    expect(screen.getByRole('heading')).toHaveTextContent('Đăng nhập');
    expect(localStorage.getItem('token')).toBeNull();
  });
  it('validates a login from another tab without renewing tokens back and forth', async () => {
    open();
    const credential = token();
    vi.mocked(authService.getMe).mockResolvedValue(user);
    await act(async () => {
      localStorage.setItem('token', credential);
      window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: credential }));
    });
    expect(screen.getByText('Khách')).toBeInTheDocument();
    expect(authService.getMe).toHaveBeenCalledOnce();
    expect(authService.refresh).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe(credential);
  });
  it('fails closed when the server rejects a stored session', async () => {
    localStorage.setItem('token', token());
    vi.mocked(authService.refresh).mockRejectedValue(new Error('Account inactive'));
    open();
    expect(await screen.findByRole('heading', { name: /Đăng nhập/ })).toBeInTheDocument();
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
