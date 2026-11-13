import { act, fireEvent, render, screen } from '@testing-library/react';
import { CONCEPT_DRAFT_KEY } from '../services/conceptDraft';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConceptOrderPage from './ConceptOrderPage';
import { conceptService, type ConceptOrder } from '../services/conceptService';

const auth = vi.hoisted(() => ({ user: { _id: 'client', roles: [6] } }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => auth,
}));
vi.mock('./ConceptAlbumPanel', () => ({ default: () => null }));
vi.mock('../services/conceptService', async (original) => ({
  ...(await original<typeof import('../services/conceptService')>()),
  conceptService: { order: vi.fn() },
}));

function fixture(kind: string): ConceptOrder {
  return {
    _id: 'order-1',
    package: 'pkg-1',
    version: 1,
    isOwner: true,
    status: kind === 'deposit' ? 'awaiting_deposit' : 'shot',
    snapshot: { name: 'Chân dung', conceptName: 'Tự nhiên', price: 900000, deposit: 270000 },
    startAt: '2026-11-14T07:00:00Z',
    endAt: '2026-11-14T08:00:00Z',
    originalStartAt: '2026-11-14T07:00:00Z',
    contactName: 'Khách demo',
    phone: '0901234567',
    people: 1,
    references: [],
    costumes: [],
    events: [],
    refundDue: 0,
    netReceived: 0,
    paymentRequests: [
      {
        id: 'request-1',
        kind,
        status: 'pending',
        amount: 270000,
        expiresAt: new Date(Date.now() + 2000).toISOString(),
        qrUrl: '/qr.png',
        demoSimulation: false,
        bankName: 'Ngân hàng',
        accountName: 'Studio',
        accountNumber: '0000000000',
        reference: 'CONC0123456789ABCDEF',
      },
    ],
  } as unknown as ConceptOrder;
}
async function open(order: ConceptOrder, search = '', state?: Record<string, unknown>) {
  vi.mocked(conceptService.order).mockResolvedValue(order);
  render(
    <MemoryRouter initialEntries={[{ pathname: '/account/concept-orders/order-1', search, state }]}>
      <Routes>
        <Route path="/account/concept-orders/:id" element={<ConceptOrderPage />} />
        <Route
          path="/concept-booking/packages/:packageId/book/review"
          element={<p>Khôi phục buổi chụp</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { _id: 'client', roles: [6] };
  vi.useFakeTimers();
  vi.setSystemTime('2026-11-12T07:00:00Z');
});
afterEach(() => vi.useRealTimers());
describe('concept payment countdowns', () => {
  it.each([
    [
      '/?period=previous&service=concept&metric=editing',
      '/?period=previous&service=concept&metric=editing',
    ],
    [
      '/workflow-bookings?service=concept&view=editing&page=2',
      '/workflow-bookings?service=concept&view=editing&page=2',
    ],
    ['https://example.com/other', '/workflow-bookings?service=concept'],
  ])(
    'returns photographer concept records to the unified filtered list: %s',
    async (returnTo, expected) => {
      auth.user = { _id: 'photographer', roles: [3] };
      const order = fixture('balance');
      order.isOwner = false;
      await open(order, '', { bookingOrdersReturnTo: returnTo });
      expect(screen.getByRole('link', { name: 'Quay lại danh sách' })).toHaveAttribute(
        'href',
        expected,
      );
    },
  );
  it('restores concept measurements, references and contact details after expiry', async () => {
    const order = fixture('deposit');
    order.status = 'expired';
    order.photographer = 'photo-1';
    order.brief = 'Chụp tự nhiên';
    order.wardrobeMeasurements = [{ size: 'M', heightCm: 165, weightKg: 50 }];
    order.references = ['https://example.com/reference'];
    await open(order, '?payment=deposit');
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại dịch vụ' }));
    expect(screen.getByText('Khôi phục buổi chụp')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY)!)).toMatchObject({
      ownerId: 'client',
      packageId: 'pkg-1',
      startAt: order.startAt,
      photographerId: 'photo-1',
      wardrobeMeasurements: order.wardrobeMeasurements,
      brief: order.brief,
      referencesText: order.references[0],
      contactName: order.contactName,
      phone: order.phone,
      step: 5,
    });
  });
  it.each(['deposit', 'balance', 'extra', 'revision'])(
    'expires %s QR locally without waiting for a server poll',
    async (kind) => {
      await open(fixture(kind), kind === 'deposit' ? '?payment=deposit' : '');
      expect(screen.getByRole('timer')).toHaveTextContent('00:02');
      expect(screen.getByRole('img', { name: /QR thanh toán/ })).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(2000));
      expect(screen.getByRole('timer')).toHaveTextContent('00:00');
      expect(screen.queryByRole('img', { name: /QR thanh toán/ })).not.toBeInTheDocument();
      expect(conceptService.order).toHaveBeenCalledTimes(1);
      if (kind !== 'deposit')
        expect(
          screen.getByRole('button', { name: 'Tạo QR mới cho số còn thiếu' }),
        ).toBeInTheDocument();
    },
  );
  it('updates the dedicated deposit screen when its deadline expires', async () => {
    await open(fixture('deposit'), '?payment=deposit');
    expect(screen.getByRole('heading', { name: 'Quét mã để thanh toán' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(
      screen.getByRole('heading', { name: 'Phiên thanh toán đã hết hạn' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('hides the timer and QR after payment is confirmed', async () => {
    const order = fixture('deposit');
    order.status = 'confirmed';
    order.paymentRequests[0].status = 'paid';
    await open(order, '?payment=deposit');
    expect(screen.getByRole('heading', { name: 'Đã nhận tiền cọc' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
