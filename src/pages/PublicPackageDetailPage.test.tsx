import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicPackageDetailPage from './PublicPackageDetailPage';

const mocks = vi.hoisted(() => ({ getPublic: vi.fn(), portal: true }));
vi.mock('../services/packageService', () => ({
  packageService: { getPublic: mocks.getPublic },
  packageImageUrl: (id: string) => `/api/media/packages/${id}`,
}));
vi.mock('../config/features', () => ({
  get clientPortalEnabled() {
    return mocks.portal;
  },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));

const pkg = {
  _id: 'package-1',
  name: 'Gói kỷ niệm',
  pricePerMember: 500000,
  duration: 'full_day',
  editingScope: 'full',
  deliveryDays: 7,
  costumes: [{ _id: 'type-1', name: 'Áo dài' }],
  details: {
    audience: 'Dành cho lớp cuối cấp',
    benefits: ['Album của lớp'],
    exclusions: ['Vé vào cổng'],
    itinerary: [{ time: '08:00', title: 'Tập trung', description: 'Chuẩn bị trang phục' }],
    process: [{ title: 'Tư vấn', description: 'Thống nhất concept' }],
    extraCosts: [{ name: 'Di chuyển', priceLabel: 'Tùy địa điểm', condition: 'Ngoài nội thành' }],
    preparationNotes: 'Mang theo nước',
    depositPolicy: 'Cọc theo báo giá',
    cancellationPolicy: 'Báo trước cho studio',
    priceNotes: 'Theo quy mô lớp',
    gallery: [
      {
        id: 'image-1.webp',
        alt: 'Ảnh lớp ngoài trời',
        caption: 'Sân trường',
        width: 300,
        height: 200,
      },
      { id: 'image-2.webp', alt: 'Ảnh tập thể', caption: 'Cả lớp', width: 300, height: 200 },
    ],
  },
};
function open() {
  return render(
    <MemoryRouter initialEntries={['/pricing/package-1']}>
      <Routes>
        <Route path="/pricing/:id" element={<PublicPackageDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Public package details', () => {
  beforeEach(() => {
    mocks.portal = true;
    mocks.getPublic.mockReset();
    mocks.getPublic.mockResolvedValue(structuredClone(pkg));
  });

  it('shows configured content and uses the existing package price and booking path', async () => {
    open();
    await screen.findByRole('heading', { level: 1, name: pkg.name });
    for (const text of [
      'Dành cho lớp cuối cấp',
      'Album của lớp',
      'Tập trung',
      'Thống nhất concept',
      'Ngoài nội thành',
      'Tùy địa điểm',
      'Mang theo nước',
      'Cọc theo báo giá',
      'Báo trước cho studio',
    ])
      expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText('Trang phục đã bao gồm: Áo dài')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đặt gói này' })).toHaveAttribute(
      'href',
      '/booking/start?source=pricing&package=package-1',
    );
    expect(screen.getByRole('link', { name: 'Tất cả gói dịch vụ' })).toHaveAttribute(
      'href',
      '/pricing',
    );
  });

  it('renders legacy packages without invented photos, schedules or policies', async () => {
    mocks.getPublic.mockResolvedValueOnce({ _id: 'legacy', name: 'Gói cũ', pricePerMember: 0 });
    open();
    await screen.findByRole('heading', { name: 'Gói cũ', level: 1 });
    expect(
      screen.queryByRole('heading', { name: 'Lịch trình buổi chụp mẫu' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Điều kiện và lưu ý' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem ảnh/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Liên hệ')).toHaveLength(2);
  });

  it('lets guests browse while booking is disabled', async () => {
    mocks.portal = false;
    open();
    await screen.findByRole('heading', { name: pkg.name, level: 1 });
    expect(screen.queryByRole('link', { name: 'Đặt gói này' })).not.toBeInTheDocument();
    expect(screen.getByText('Album của lớp')).toBeInTheDocument();
  });

  it('navigates gallery images using keyboard and restores focus on Escape', async () => {
    open();
    const trigger = await screen.findByRole('button', { name: 'Xem ảnh 1: Ảnh lớp ngoài trời' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Ảnh lớp ngoài trời' })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(within(dialog).getByRole('img', { name: 'Ảnh tập thể' })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('retries a network error and distinguishes a removed package', async () => {
    mocks.getPublic.mockRejectedValueOnce(new Error('offline'));
    const page = open();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('heading', { name: pkg.name, level: 1 });
    expect(mocks.getPublic).toHaveBeenCalledTimes(2);
    page.unmount();
    mocks.getPublic.mockRejectedValueOnce({ response: { status: 404 } });
    open();
    await screen.findByRole('heading', { name: 'Không tìm thấy gói dịch vụ' });
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });
});
