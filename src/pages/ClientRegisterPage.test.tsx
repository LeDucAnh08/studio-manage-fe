import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import ClientRegisterPage from './ClientRegisterPage';
import LoginPage from './LoginPage';

const { successToast, loginMock } = vi.hoisted(() => ({
  successToast: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
}));

vi.mock('react-toastify', () => ({
  toast: { success: successToast },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

function DestinationProbe() {
  const location = useLocation();
  return <p data-testid="destination">{location.pathname + location.search}</p>;
}

describe('ClientRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    loginMock.mockResolvedValue({ roles: [6] });
  });

  it('normalizes the username and never sends client-supplied roles', async () => {
    render(
      <MemoryRouter>
        <ClientRegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Họ tên/), { target: { value: 'Khách thử' } });
    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), {
      target: { value: 'Client.Test' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/), {
      target: { value: 'test-pass-123' },
    });
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/), {
      target: { value: 'test-pass-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Khách thử',
        username: 'client.test',
        password: 'test-pass-123',
      }),
    );
    expect(successToast).toHaveBeenCalled();
  });

  it('shows a validation error when password confirmation differs', async () => {
    render(
      <MemoryRouter>
        <ClientRegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/), {
      target: { value: 'test-pass-123' },
    });
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/), {
      target: { value: 'different-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(await screen.findByText('Mật khẩu không khớp')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('preserves the booking return target through registration and login', async () => {
    const returnTo = '/account/bookings/new?source=pricing&package=package-1';

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: returnTo } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<ClientRegisterPage />} />
          <Route path="*" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /nhân sự/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Đăng ký khách hàng' }));
    fireEvent.change(screen.getByLabelText(/Họ tên/), { target: { value: 'Khách thử' } });
    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), { target: { value: 'client.test' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/), { target: { value: 'test-pass-123' } });
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/), {
      target: { value: 'test-pass-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await screen.findByRole('button', { name: 'Đăng nhập' });
    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), { target: { value: 'client.test' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/), { target: { value: 'test-pass-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByTestId('destination')).toHaveTextContent(returnTo);
  });
});
