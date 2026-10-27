import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicDiscoveryPage from './PublicDiscoveryPage';
const mocks = vi.hoisted(() => ({ packages: vi.fn(), portal: true }));
vi.mock('../services/packageService', () => ({ packageService: { listPublic: mocks.packages } }));
vi.mock('../config/features', () => ({
  get clientPortalEnabled() {
    return mocks.portal;
  },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));
function open(page: 'services' | 'concepts' | 'pricing') {
  return render(
    <MemoryRouter initialEntries={['/' + page]}>
      <PublicDiscoveryPage page={page} />
    </MemoryRouter>,
  );
}
describe('Independent discovery pages', () => {
  beforeEach(() => {
    mocks.portal = true;
    mocks.packages.mockResolvedValue([]);
  });
  it('keeps services and process on their own screen without loading pricing', () => {
    open('services');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dịch vụ chụp ảnh');
    expect(
      screen.getByRole('heading', { name: '4 bước – nhẹ nhàng, minh bạch' }),
    ).toBeInTheDocument();
    expect(mocks.packages).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /Nhận tư vấn/ })).not.toBeInTheDocument();
  });
  it('passes a selected concept to booking without rendering the portfolio', () => {
    open('concepts');
    expect(screen.getByRole('link', { name: 'Đặt với concept Cử nhân' })).toHaveAttribute(
      'href',
      '/booking/start?source=concepts&concept=' + encodeURIComponent('Cử nhân'),
    );
    expect(
      screen.queryByRole('heading', { name: 'Mỗi bộ ảnh là một câu chuyện' }),
    ).not.toBeInTheDocument();
    expect(mocks.packages).not.toHaveBeenCalled();
  });
  it('renders live package prices and preserves a selected package in its booking link', async () => {
    mocks.packages.mockResolvedValue([
      {
        _id: 'p1',
        name: 'Gói thử',
        pricePerMember: 500000,
        duration: 'full_day',
        isPopular: true,
        costumes: [
          { _id: 'type-1', name: 'Áo dài' },
          { _id: 'type-2', name: 'Vest' },
        ],
      },
    ]);
    open('pricing');
    await screen.findByText('Gói thử');
    expect(screen.getByText(/Đã bao gồm trang phục: Áo dài, Vest/)).toBeInTheDocument();
    expect(
      screen.getByText(/Studio tư vấn mẫu và size trang phục khi chốt lịch/),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Đặt lịch' })
        .some((link) => link.getAttribute('href') === '/booking/start?source=pricing&package=p1'),
    ).toBe(true);
    expect(screen.queryByRole('link', { name: /Nhận tư vấn/ })).not.toBeInTheDocument();
  });
  it('retries a pricing failure and shows the real empty state', async () => {
    mocks.packages.mockRejectedValueOnce(new Error('offline'));
    open('pricing');
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Bảng giá đang được cập nhật');
    expect(mocks.packages).toHaveBeenCalledTimes(2);
  });
  it('keeps browsing available while hiding booking actions when the portal is disabled', async () => {
    mocks.portal = false;
    open('pricing');
    await screen.findByText('Bảng giá đang được cập nhật');
    expect(screen.queryByRole('link', { name: 'Đặt lịch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });
});
