import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), roles: [0, 1], logout: vi.fn() }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Quản trị viên', roles: mocks.roles }, logout: mocks.logout }),
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
    mocks.roles = [0, 1];
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('logs the admin out and opens the shared customer login', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/manage/finance']}>
        <Routes>
          <Route path="/manage/finance" element={<Sidebar isOpen onClose={onClose} />} />
          <Route path="/login" element={<h1>Đăng nhập chung</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất →' }));

    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Đăng nhập chung' })).toBeInTheDocument();
  });

  it('labels the season control and preserves the photographer navigation', () => {
    mocks.roles = [3];
    render(
      <MemoryRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('combobox', { name: 'Mùa chụp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lịch chụp' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quản lý' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Đơn thuê' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Yume Studio' })).not.toBeInTheDocument();
  });
  it.each([{ roles: [0] }, { roles: [3] }, { roles: [5] }])(
    'shows one photography workspace for roles $roles',
    ({ roles }) => {
      mocks.roles = roles;
      render(
        <MemoryRouter>
          <Sidebar isOpen onClose={vi.fn()} />
        </MemoryRouter>,
      );
      expect(screen.getAllByRole('link', { name: 'Đơn chụp ảnh' })).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'Đơn chụp ảnh' })).toHaveAttribute(
        'href',
        '/workflow-bookings',
      );
      expect(screen.queryByRole('link', { name: 'Yêu cầu đặt dịch vụ' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Quy trình dịch vụ' })).not.toBeInTheDocument();
    },
  );

  it('removes closed mobile navigation from the DOM, focuses the drawer and restores its trigger on Escape', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => false,
    }));
    function MobileMenu() {
      const [open, setOpen] = useState(false);
      const trigger = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={trigger} onClick={() => setOpen(true)}>
            Mở menu
          </button>
          <Sidebar isOpen={open} onClose={() => setOpen(false)} triggerRef={trigger} />
        </>
      );
    }
    render(
      <MemoryRouter>
        <MobileMenu />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'Mở menu' });
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất →' })).not.toBeInTheDocument();
    trigger.focus();
    fireEvent.click(trigger);
    const drawer = await screen.findByRole('dialog', { name: 'Điều hướng nội bộ' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveFocus());
    expect(screen.getByRole('combobox', { name: 'Mùa chụp' })).toBeInTheDocument();
    fireEvent.keyDown(drawer, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Đăng xuất →' })).not.toBeInTheDocument();
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
