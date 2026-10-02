import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const mocks = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Quản trị viên', roles: [0, 1] }, logout: vi.fn() }),
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'light',
    resolvedTheme: 'light',
    setThemeMode: vi.fn(),
  }),
}));

vi.mock('../../store', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: () => ({ list: [], selectedSeasonId: '' }),
}));

vi.mock('../atoms', () => ({ Logo: () => <span aria-hidden="true" /> }));

describe('Sidebar navigation', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    mocks.dispatch.mockClear();
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  it('keeps only one group open and exposes the controlled panel to assistive technology', () => {
    render(
      <MemoryRouter initialEntries={['/customers/size']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const customers = screen.getByRole('button', { name: 'Khách hàng' });
    const manage = screen.getByRole('button', { name: 'Quản lý' });
    const customersPanel = document.getElementById(customers.getAttribute('aria-controls')!);

    expect(customers).toHaveAttribute('aria-expanded', 'true');
    expect(customersPanel).not.toBeNull();
    expect(customersPanel).not.toHaveAttribute('hidden');
    expect(screen.getByRole('link', { name: 'Thông tin học sinh' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });

    fireEvent.click(manage);

    expect(customers).toHaveAttribute('aria-expanded', 'false');
    expect(manage).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(customers.getAttribute('aria-controls')!)).toHaveAttribute(
      'hidden',
    );
  });

  it('opens the group for the current route and scrolls its active link into view', () => {
    render(
      <MemoryRouter initialEntries={['/customers/size']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quản lý' }));
    fireEvent.click(screen.getByRole('link', { name: 'Tài chính' }));

    expect(screen.getByRole('button', { name: 'Khách hàng' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Quản lý' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Tài chính' })).toHaveAttribute('aria-current', 'page');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });
});
