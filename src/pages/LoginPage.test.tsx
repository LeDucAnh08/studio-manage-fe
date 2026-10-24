import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '@/components/customer/CustomerAppearance';
import LoginPage from './LoginPage';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

function DestinationProbe() {
  const location = useLocation();
  return (
    <>
      <p data-testid="destination">{location.pathname + location.search + location.hash}</p>
      <p data-testid="destination-state">{JSON.stringify(location.state)}</p>
    </>
  );
}

function renderLogin({
  customer = true,
  state,
  search = '',
}: {
  customer?: boolean;
  state?: unknown;
  search?: string;
} = {}) {
  const login = <LoginPage />;
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', search, state }]}>
      <Routes>
        <Route
          path="/login"
          element={
            customer ? (
              <CustomerAppearanceContext.Provider value={true}>
                {login}
              </CustomerAppearanceContext.Provider>
            ) : (
              login
            )
          }
        />
        <Route path="*" element={<DestinationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillCredentials(username = 'customer.test', password = 'test-pass-123') {
  fireEvent.change(screen.getByLabelText(/^Tên đăng nhập/), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/^Mật khẩu/), { target: { value: password } });
}

function submitLogin() {
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('Login appearance preserves authentication and return contracts', () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue({ roles: [6] });
  });

  it.each([true, false])(
    'keeps labelled native credentials and login available with customer appearance %s',
    async (customer) => {
      renderLogin({ customer });
      const username = screen.getByLabelText(/^Tên đăng nhập/);
      const password = screen.getByLabelText(/^Mật khẩu/);
      expect(username).toHaveAttribute('autocomplete', 'username');
      expect(password).toHaveAttribute('type', 'password');
      expect(password).toHaveAttribute('autocomplete', 'current-password');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        customer ? 'Đăng nhập' : 'Yume Studio',
      );
      fillCredentials();
      submitLogin();
      expect((await screen.findByTestId('destination')).textContent).toBe('/account/orders');
      expect(loginMock).toHaveBeenCalledWith('customer.test', 'test-pass-123');
    },
  );

  it('describes required customer fields and prevents an empty login request', async () => {
    renderLogin();
    submitLogin();
    const usernameError = await screen.findByText('Nhập tên đăng nhập');
    const passwordError = await screen.findByText('Nhập mật khẩu');
    const username = screen.getByLabelText(/^Tên đăng nhập/);
    const password = screen.getByLabelText(/^Mật khẩu/);
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(username).toHaveAttribute('aria-describedby', usernameError.id);
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-describedby', passwordError.id);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('retains exact credentials through failure, disables pending duplicate clicks and retries', async () => {
    let finishLogin: ((user: { roles: number[] }) => void) | undefined;
    const pendingLogin = new Promise<{ roles: number[] }>((resolve) => {
      finishLogin = resolve;
    });
    loginMock.mockRejectedValueOnce(new Error('Invalid credentials'));
    loginMock.mockImplementationOnce(() => pendingLogin);
    renderLogin();
    fillCredentials(' Client.Test ', ' password with spaces ');
    submitLogin();
    const message = 'Tên đăng nhập hoặc mật khẩu không đúng.';
    expect(await screen.findByText(message)).toHaveAttribute('role', 'alert');
    expect(loginMock).toHaveBeenNthCalledWith(1, ' Client.Test ', ' password with spaces ');
    expect(screen.getByLabelText(/^Tên đăng nhập/)).toHaveValue(' Client.Test ');
    expect(screen.getByLabelText(/^Mật khẩu/)).toHaveValue(' password with spaces ');

    submitLogin();
    const pendingButton = await screen.findByRole('button', { name: 'Đang đăng nhập…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton.closest('form')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.click(pendingButton);
    fireEvent.click(pendingButton);
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(2));
    expect(loginMock).toHaveBeenNthCalledWith(2, ' Client.Test ', ' password with spaces ');

    await act(async () => finishLogin?.({ roles: [6] }));
    expect((await screen.findByTestId('destination')).textContent).toBe('/account/orders');
    expect(loginMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { roles: [6], target: '/booking/start?source=portfolio#review' },
    { roles: [5, 6], target: '/booking/start?source=portfolio#review' },
    { roles: [5], target: '/manage/finance' },
    { roles: [0, 5], target: '/' },
    { roles: [0], target: '/' },
  ])('keeps role priority for $roles', async ({ roles, target }) => {
    loginMock.mockResolvedValueOnce({ roles });
    renderLogin({ state: { from: '/booking/start?source=portfolio#review' } });
    fillCredentials();
    submitLogin();
    expect((await screen.findByTestId('destination')).textContent).toBe(target);
  });

  it('prefers a validated state return target over a different query target including hash', async () => {
    const stateTarget = '/booking/start?source=pricing&package=package-1#review';
    renderLogin({
      state: { from: stateTarget },
      search: '?returnTo=' + encodeURIComponent('/rental/start?item=costume-1#review'),
    });
    fillCredentials();
    submitLogin();
    expect((await screen.findByTestId('destination')).textContent).toBe(stateTarget);
  });

  it('falls back from an invalid state to a validated query return target', async () => {
    const queryTarget = '/rental/start?item=costume-1#review';
    renderLogin({
      state: { from: 'https://other.example/account/bookings' },
      search: '?returnTo=' + encodeURIComponent(queryTarget),
    });
    fillCredentials();
    submitLogin();
    expect((await screen.findByTestId('destination')).textContent).toBe(queryTarget);
  });

  it('uses the customer home when both return inputs are unsafe or unrelated', async () => {
    for (const target of [
      'https://other.example/account/bookings',
      '//other.example/account/bookings',
      '/\\other.example/account/bookings',
      '/manage/finance',
      '/account/bookings?draft=bad\nvalue',
    ]) {
      const page = renderLogin({
        state: { from: target },
        search: '?returnTo=' + encodeURIComponent(target),
      });
      fillCredentials();
      submitLogin();
      expect((await screen.findByTestId('destination')).textContent).toBe('/account/orders');
      page.unmount();
    }
    expect(loginMock).toHaveBeenCalledTimes(5);
  });

  it('keeps the validated return state on the customer registration link', async () => {
    const returnTo = '/account/bookings/new?source=pricing&package=package-1#review';
    renderLogin({ state: { from: returnTo } });
    fireEvent.click(screen.getByRole('link', { name: 'Đăng ký khách hàng' }));
    expect((await screen.findByTestId('destination')).textContent).toBe('/register');
    expect(screen.getByTestId('destination-state')).toHaveTextContent(
      JSON.stringify({ from: returnTo }),
    );
    expect(loginMock).not.toHaveBeenCalled();
  });
});
