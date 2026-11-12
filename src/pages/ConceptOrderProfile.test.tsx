import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConceptOrderPage from './ConceptOrderPage';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import { conceptService, type ConceptOrder, type ConceptAlbum } from '../services/conceptService';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'client', roles: [6] } }),
}));
vi.mock('../services/conceptService', async (original) => ({
  ...(await original<typeof import('../services/conceptService')>()),
  conceptService: { order: vi.fn(), command: vi.fn(), availability: vi.fn(), album: vi.fn() },
}));
const fixture = (): ConceptOrder =>
  ({
    _id: 'concept-order',
    package: 'pkg',
    version: 3,
    isOwner: true,
    status: 'confirmed',
    orderStage: 'deposited',
    photographer: 'photo',
    snapshot: {
      name: 'Chân dung Tự nhiên',
      conceptName: 'Chân dung cá nhân',
      price: 900000,
      deposit: 270000,
      durationMinutes: 60,
      retouchQuota: 10,
      extraPhotoPrice: 70000,
    },
    startAt: '2026-12-14T07:00:00Z',
    endAt: '2026-12-14T08:00:00Z',
    originalStartAt: '2026-12-14T07:00:00Z',
    contactName: 'Mai Anh',
    phone: '0912345678',
    people: 1,
    wardrobe: 'pending',
    brief: 'Ánh sáng dịu, màu ấm.',
    references: ['https://example.com/reference'],
    costumes: [],
    wardrobeMeasurements: [{ size: 'M', heightCm: 165, weightKg: 55 }],
    netReceived: 270000,
    refundDue: 0,
    paymentRequests: [],
    payments: [{ kind: 'deposit', amount: 270000, at: '2026-11-12T07:00:00Z' }],
    events: [{ action: 'payment', message: 'Đã nhận đủ cọc.', at: '2026-11-12T07:00:00Z' }],
    canReschedule: true,
    canCancel: true,
  }) as unknown as ConceptOrder;
const returnTo = '/account/orders?tab=concepts&view=deposited&page=2&order=concept-order';
function open() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/account/concept-orders/concept-order', state: { ordersReturnTo: returnTo } },
      ]}
    >
      <CustomerAppearanceContext.Provider value={true}>
        <Routes>
          <Route path="/account/concept-orders/:id" element={<ConceptOrderPage />} />
        </Routes>
      </CustomerAppearanceContext.Provider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(conceptService.order).mockResolvedValue(fixture());
  vi.mocked(conceptService.album).mockRejectedValue({ response: { status: 404 } });
});
describe('customer concept order profile', () => {
  it('shows a yearbook-style profile with contact details, progress, financial summary and a contextual Back link', async () => {
    open();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Chân dung Tự nhiên' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Hồ sơ chụp concept')).toBeInTheDocument();
    expect(screen.getByText('Mai Anh')).toBeInTheDocument();
    expect(screen.getByText('0912345678')).toBeInTheDocument();
    expect(screen.getByText('Phiên bản hồ sơ 3')).toBeInTheDocument();
    const progress = screen.getByRole('region', { name: 'Tiến độ đơn' });
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Đã cọc');
    expect(screen.getByRole('link', { name: 'Quay lại danh sách' })).toHaveAttribute(
      'href',
      returnTo,
    );
    expect(screen.getByRole('link', { name: 'Ảnh mẫu tham khảo' })).toHaveAttribute(
      'href',
      'https://example.com/reference',
    );
    expect(screen.getByText('Người 1 · Size M · 165 cm · 55 kg')).toBeInTheDocument();
    expect(screen.getAllByText('270.000 ₫')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại hồ sơ' }));
    await waitFor(() => expect(conceptService.order).toHaveBeenCalledTimes(2));
  });
  it('keeps date selection and the reschedule command working with shared form controls', async () => {
    const next = '2026-12-15T07:00:00Z';
    vi.mocked(conceptService.availability).mockResolvedValue({
      day: '2026-12-15',
      available: true,
      slots: [
        {
          startAt: next,
          endAt: '2026-12-15T08:00:00Z',
          photographers: [{ _id: 'photo', name: 'Thợ chụp', portfolio: [] }],
        },
      ],
    });
    vi.mocked(conceptService.command).mockResolvedValue({
      ...fixture(),
      version: 4,
      startAt: next,
    });
    open();
    fireEvent.change(await screen.findByLabelText('Ngày mới'), { target: { value: '2026-12-15' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /15\/12/ })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Khung giờ mới'), { target: { value: next } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đổi lịch' }));
    await waitFor(() =>
      expect(conceptService.command).toHaveBeenCalledWith(
        'concept-order',
        'reschedule',
        { startAt: next, expectedVersion: 3 },
        expect.any(String),
      ),
    );
  });
  it('preserves the cancellation preview and sends the agreed version on confirmation', async () => {
    vi.mocked(conceptService.command).mockResolvedValue({
      ...fixture(),
      status: 'cancelled',
      orderStage: 'cancelled',
      canCancel: false,
      canReschedule: false,
    });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xem khoản hoàn và hủy' }));
    expect(screen.getByText(/khoản dự kiến hoàn/)).toHaveTextContent('270.000 đ');
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy buổi chụp' }));
    await waitFor(() =>
      expect(conceptService.command).toHaveBeenCalledWith(
        'concept-order',
        'cancel',
        { expectedVersion: 3 },
        expect.any(String),
      ),
    );
    expect(await screen.findAllByText('Hủy')).toHaveLength(2);
  });
  it('renders the album and editing controls inside a handed-over customer profile', async () => {
    vi.mocked(conceptService.order).mockResolvedValue({
      ...fixture(),
      status: 'shot',
      orderStage: 'handing_over',
      canCancel: false,
      canReschedule: false,
    });
    vi.mocked(conceptService.album).mockResolvedValue({
      id: 'album',
      title: 'Album chân dung',
      version: 1,
      status: 'selecting',
      photos: [],
      deliveries: [],
      selections: [],
      feedbackRounds: [],
      paidRequests: [],
      freeRoundsUsed: 0,
    } as unknown as ConceptAlbum);
    open();
    expect(await screen.findByRole('heading', { name: 'Album chân dung' })).toBeInTheDocument();
    const section = screen.getByRole('heading', { name: 'Album và hậu kỳ' }).closest('section')!;
    expect(
      within(section).getByRole('checkbox', { name: /Tôi chốt danh sách/ }),
    ).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Chốt ảnh retouch' })).toBeDisabled();
    expect(
      screen.getByRole('region', { name: 'Tiến độ đơn' }).querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Đang bàn giao');
  });
});
