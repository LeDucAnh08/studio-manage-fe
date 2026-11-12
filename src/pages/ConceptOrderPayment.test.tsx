import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConceptOrderPage from './ConceptOrderPage';
import { conceptService, type ConceptOrder } from '../services/conceptService';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'client', roles: [6] } }),
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
async function open(order: ConceptOrder, search = '') {
  vi.mocked(conceptService.order).mockResolvedValue(order);
  render(
    <MemoryRouter initialEntries={['/account/concept-orders/order-1' + search]}>
      <Routes>
        <Route path="/account/concept-orders/:id" element={<ConceptOrderPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime('2026-11-12T07:00:00Z');
});
afterEach(() => vi.useRealTimers());
describe('concept payment countdowns', () => {
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
