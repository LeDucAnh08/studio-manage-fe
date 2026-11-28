import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), roles: [0, 1], logout: vi.fn() }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Quản trị viên', roles: mocks.roles }, logout: mocks.logout }),
}));
vi.mock('../../config/features', () => ({
  clientPortalEnabled: true,
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
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.matches('nav[aria-label="Chức năng nội bộ"]')) return new DOMRect(0, 80, 240, 160);
      if (this.matches('a[aria-current="page"]')) {
        const container = this.closest('nav');
        return new DOMRect(0, 260 - (container?.scrollTop ?? 0), 200, 40);
      }
      return new DOMRect();
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([0, 1])('shows user management once inside Customers for admin role %s', (role) => {
    mocks.roles = [role];
    render(
      <MemoryRouter initialEntries={['/customers/users']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const customers = screen.getByRole('button', { name: 'Khách hàng' });
    expect(screen.queryByRole('combobox', { name: 'Mùa chụp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đặc biệt' })).not.toBeInTheDocument();
    expect(screen.queryByText('Quản trị', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quản lý' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cài đặt' })).not.toBeInTheDocument();
    expect(customers).toHaveAttribute('aria-expanded', 'true');
    const users = screen.getAllByRole('link', { name: 'Người dùng' });
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveAttribute('href', '/customers/users');
    expect(users[0]).toHaveAttribute('aria-current', 'page');
  });
  it.each([2, 3, 4, 5, 6])('does not offer user management for role %s', (role) => {
    mocks.roles = [role];
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Người dùng' })).not.toBeInTheDocument();
  });

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

  it('removes the season control and preserves the photographer navigation', () => {
    mocks.roles = [3];
    render(
      <MemoryRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('combobox', { name: 'Mùa chụp' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lịch chụp' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quản lý thợ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quản lý' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Đơn thuê' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Chụp concept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Yume Studio' })).not.toBeInTheDocument();
  });
  it.each([{ roles: [3, 5] }, { roles: [3] }])(
    'hides the separate concept entry in the personal photographer workspace $roles',
    ({ roles }) => {
      mocks.roles = roles;
      render(
        <MemoryRouter>
          <Sidebar isOpen={false} onClose={vi.fn()} />
        </MemoryRouter>,
      );
      expect(screen.getByRole('link', { name: 'Đơn chụp ảnh' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Chụp concept' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Portfolio của tôi' })).toHaveAttribute(
        'href',
        '/my-portfolio',
      );
    },
  );
  it('groups photography orders while retaining concept catalog settings for administrators', () => {
    render(
      <MemoryRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Chụp concept' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý concept' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đơn chụp ảnh' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý thợ' })).toHaveAttribute(
      'href',
      '/staff/photographers',
    );
    expect(screen.getByRole('link', { name: 'Tài chính' })).toHaveAttribute(
      'href',
      '/manage/finance',
    );
    expect(screen.queryByRole('link', { name: 'Portfolio của tôi' })).not.toBeInTheDocument();
  });
  it.each([0, 1])('opens wardrobe management as its own group for admin role %s', (role) => {
    mocks.roles = [role];
    render(
      <MemoryRouter initialEntries={['/settings/costumes/types']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Quản lý trang phục' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Kho trang phục' })).toHaveAttribute(
      'href',
      '/settings/costumes',
    );
    expect(screen.getByRole('link', { name: 'Loại trang phục' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('button', { name: 'Cài đặt' })).not.toBeInTheDocument();
  });
  it('keeps photography orders active when the photographer opens a concept record', () => {
    mocks.roles = [3];
    render(
      <MemoryRouter initialEntries={['/concept-orders/concept-1']}>
        <Sidebar isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Đơn chụp ảnh' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Đơn chụp ảnh' })).toHaveAttribute(
      'href',
      '/workflow-bookings',
    );
    expect(screen.queryByRole('button', { name: 'Quản lý trang phục' })).not.toBeInTheDocument();
  });
  it.each([{ roles: [0] }, { roles: [3] }, { roles: [1] }])(
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
      expect(screen.queryByRole('link', { name: 'Yêu cầu chụp kỉ yếu' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('combobox', { name: 'Mùa chụp' })).not.toBeInTheDocument();
    fireEvent.keyDown(drawer, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Đăng xuất →' })).not.toBeInTheDocument();
  });

  it('keeps retired finance permissions out of a legacy photographer account', () => {
    mocks.roles = [3, 5];
    render(
      <MemoryRouter initialEntries={['/workflow-bookings']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Tài chính' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Người dùng' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đơn chụp ảnh' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the group for the current route and scrolls its active link into view', () => {
    mocks.roles = [1];
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quản lý trang phục' }));
    fireEvent.click(screen.getByRole('link', { name: 'Kho trang phục' }));

    expect(screen.getByRole('button', { name: 'Khách hàng' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Quản lý trang phục' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Kho trang phục' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const navigation = screen.getByRole('navigation', { name: 'Chức năng nội bộ' });
    expect(
      screen.getByRole('link', { name: 'Kho trang phục' }).getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(navigation.getBoundingClientRect().bottom);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
