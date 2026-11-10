import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import ConceptBookingPage, { CONCEPT_DRAFT_KEY } from './ConceptBookingPage';
import { GuestConceptAlbumPage } from './ConceptAlbumPanel';
import {
  conceptService,
  type Catalog,
  type ConceptOrder,
  type ConceptAlbum,
} from '../services/conceptService';

const { auth } = vi.hoisted(() => ({
  auth: {
    user: { _id: 'client-1', emailVerifiedAt: '2026-01-01', roles: [6] } as {
      _id: string;
      emailVerifiedAt?: string;
      roles: number[];
    } | null,
  },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/Layout/PublicSiteLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('../services/conceptService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/conceptService')>();
  return {
    ...original,
    conceptService: {
      catalog: vi.fn(),
      availability: vi.fn(),
      costumes: vi.fn(),
      checkout: vi.fn(),
      guestAlbum: vi.fn(),
      image: vi.fn(),
    },
  };
});
const catalog: Catalog = {
  concepts: [
    { _id: 'concept-1', name: 'Nàng thơ', description: 'Mô tả', coverUrl: '', active: true },
  ],
  packages: [
    {
      _id: 'pkg-1',
      concept: 'concept-1',
      name: 'Gói riêng',
      price: 1000000,
      durationMinutes: 60,
      maxPeople: 2,
      retouchQuota: 10,
      extraPhotoPrice: 50000,
      costumeTypes: [],
      costumeCount: 0,
      active: true,
      version: 3,
    },
  ],
  settings: {
    openMinutes: 540,
    closeMinutes: 1140,
    stepMinutes: 30,
    bufferMinutes: 60,
    horizonDays: 90,
    closedWeekdays: [],
    version: 0,
  },
};
beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  auth.user = { _id: 'client-1', emailVerifiedAt: '2026-01-01', roles: [6] };
  vi.mocked(conceptService.catalog).mockResolvedValue(catalog);
  vi.mocked(conceptService.availability).mockImplementation(async (_id, day) => ({
    day,
    available: true,
    slots: [
      {
        startAt: `${day}T10:00:00.000Z`,
        endAt: `${day}T11:00:00.000Z`,
        photographers: [{ _id: 'photo-1', name: 'Thợ An', portfolio: [] }],
      },
    ],
  }));
  vi.mocked(conceptService.costumes).mockResolvedValue([]);
});
const renderWizard = () =>
  render(
    <MemoryRouter initialEntries={['/concept-booking']}>
      <Routes>
        <Route path="/concept-booking" element={<ConceptBookingPage />} />
        <Route path="/account/concept-orders/:id" element={<p>Hồ sơ mới</p>} />
      </Routes>
    </MemoryRouter>,
  );
async function fillWizard() {
  fireEvent.click(await screen.findByRole('button', { name: 'Chọn Gói riêng' }));
  await waitFor(() =>
    expect(screen.queryByText('Đang kiểm tra lịch trống…')).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getAllByRole('button').find((b) => b.textContent?.includes('1 khung giờ'))!,
  );
  fireEvent.click(screen.getByRole('button', { name: /17:00/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chọn Thợ An' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  fireEvent.change(screen.getByLabelText('Họ tên liên hệ'), { target: { value: 'Khách An' } });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  await screen.findByRole('heading', { name: 'Kiểm tra trước khi đặt cọc' });
}
describe('concept booking contract', () => {
  it('does not create an order while choosing a package, date, photographer and brief', async () => {
    renderWizard();
    await fillWizard();
    expect(conceptService.checkout).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CONCEPT_DRAFT_KEY)).toContain('Khách An');
    expect(screen.getByRole('button', { name: 'Tạo QR cọc 30%' })).toBeDisabled();
  });
  it('preserves the draft but blocks QR creation for an unverified account', async () => {
    auth.user = { _id: 'client-1', roles: [6] };
    renderWizard();
    await fillWizard();
    expect(screen.getByRole('link', { name: 'Cập nhật và xác thực email' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
    expect(screen.queryByRole('button', { name: 'Tạo QR cọc 30%' })).not.toBeInTheDocument();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('submits the agreed package version without trusting client prices and reuses retry identity', async () => {
    vi.mocked(conceptService.checkout)
      .mockRejectedValueOnce({ response: { data: { message: 'Tạm mất kết nối' } } })
      .mockResolvedValueOnce({ _id: 'new-order' } as ConceptOrder);
    renderWizard();
    await fillWizard();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo QR cọc 30%' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo QR cọc 30%' }));
    await screen.findByText('Hồ sơ mới');
    const [first, second] = vi.mocked(conceptService.checkout).mock.calls;
    expect(first[1]).toEqual(second[1]);
    expect(first[0]).toMatchObject({
      packageId: 'pkg-1',
      packageVersion: 3,
      accepted: true,
      photographerId: 'photo-1',
    });
    expect(first[0]).not.toHaveProperty('price');
    expect(sessionStorage.getItem(CONCEPT_DRAFT_KEY)).toBeNull();
  });
  it('does not expose a previous account draft after switching accounts', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'another-client',
        packageId: 'pkg-1',
        step: 5,
        contactName: 'Private Name',
        costumes: [],
      }),
    );
    renderWizard();
    await screen.findByRole('button', { name: 'Chọn Gói riêng' });
    expect(screen.queryByDisplayValue('Private Name')).not.toBeInTheDocument();
  });
  it('disables dates for which the server reports no suitable photographers', async () => {
    vi.mocked(conceptService.availability).mockImplementation(async (_id, day) => ({
      day,
      available: false,
      slots: [],
    }));
    renderWizard();
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn Gói riêng' }));
    await waitFor(() =>
      expect(screen.queryByText('Đang kiểm tra lịch trống…')).not.toBeInTheDocument(),
    );
    const dates = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('0 khung giờ'));
    expect(dates).toHaveLength(7);
    dates.forEach((d) => expect(d).toBeDisabled());
  });
});
it('guest album uses an independent read-only client and offers no selection, feedback or download', async () => {
  vi.mocked(conceptService.guestAlbum).mockResolvedValue({
    title: 'Album riêng',
    version: 1,
    status: 'selecting',
    deliveryVersion: 0,
    allowDownload: false,
    photos: [],
    deliveries: [],
  } as unknown as ConceptAlbum);
  window.history.replaceState({}, '', '/concept-albums/public-id#access=share-token');
  render(
    <MemoryRouter initialEntries={['/concept-albums/public-id']}>
      <Routes>
        <Route path="/concept-albums/:publicId" element={<GuestConceptAlbumPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Album riêng' });
  expect(conceptService.guestAlbum).toHaveBeenCalledWith(
    'public-id',
    'share-token',
    expect.any(AbortSignal),
  );
  expect(screen.queryByRole('button', { name: /Chốt|Gửi|Tải/ })).not.toBeInTheDocument();
});
