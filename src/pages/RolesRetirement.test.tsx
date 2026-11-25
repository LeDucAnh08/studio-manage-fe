import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import RegisterRequestPage from './RegisterRequestPage';
import UsersPage from './UsersPage';
import usersReducer from '../store/slices/usersSlice';

beforeAll(() =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterAll(() => vi.unstubAllGlobals());

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'admin', roles: [1] }, updateUser: vi.fn() }),
}));
vi.mock('../services/userService', () => ({
  userService: { getAll: async () => [], create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('../services/accountRequestService', () => ({
  accountRequestService: { getAll: async () => [], submit: vi.fn(), review: vi.fn() },
}));

describe('Retired staff roles', () => {
  it('offers only photographer requests, without requesting admin rights by default', () => {
    render(
      <MemoryRouter>
        <RegisterRequestPage />
      </MemoryRouter>,
    );
    const roles = screen.getByRole('combobox');
    expect(
      within(roles)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Thợ chụp ảnh']);
    expect(roles).toHaveValue('3');
  });

  it('requires explicit role selection and removes sales and accountant roles from account management', async () => {
    const store = configureStore({ reducer: { users: usersReducer } });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thêm người dùng' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/^Sale$/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Kế toán')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Cộng tác viên/)).not.toBeInTheDocument();
    const choices = within(dialog).getAllByRole('checkbox');
    expect(choices).toHaveLength(5); // Four role choices plus the account-active checkbox.
    expect(
      choices.filter((choice) => choice.getAttribute('data-state') === 'checked'),
    ).toHaveLength(0);
    for (const label of ['Superadmin', 'Admin', 'Thợ chụp ảnh', 'Khách hàng'])
      expect(within(dialog).getByText(label)).toBeInTheDocument();
  });
});
