import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RentalDetailPage from './RentalDetailPage';
import { rentalService, type RentalOrder } from '../services/rentalService';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import { RENTAL_DRAFT_KEY } from '../services/rentalDraft';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'client', roles: [6] } }),
}));
vi.mock('../services/rentalService', async (original) => ({
  ...(await original<typeof import('../services/rentalService')>()),
  rentalService: { get: vi.fn() },
}));

function fixture(): RentalOrder {
  return {
    _id: 'rental-1',
    version: 1,
    status: 'awaiting_deposit',
    autoCheckout: true,
    pricingMode: 'daily',
    contactName: 'Khách thuê',
    phone: '0901234567',
    note: '',
    requestedReceiveDate: '2026-11-21',
    requestedReturnDate: '2026-11-22',
    requestedLines: [
      { costumeId: 'costume-1', name: 'Áo dài', size: 'M', quantity: 3, unitPrice: 115000 },
    ],
    quote: {
      version: 1,
      pricingMode: 'daily',
      rentalDays: 2,
      lines: [
        { costumeId: 'costume-1', name: 'Áo dài', size: 'M', quantity: 3, unitPrice: 115000 },
      ],
      receiveDate: '2026-11-21',
      returnDate: '2026-11-22',
      fee: 690000,
      deposit: 207000,
      depositKind: 'advance',
      depositPercent: 30,
      terms: [],
      acceptedAt: '2026-11-12T07:00:00Z',
    },
    reservation: { status: 'held', expiresAt: '2026-11-12T07:00:02Z' },
    depositPayment: {
      provider: 'sepay',
      mode: 'sandbox',
      reference: 'RENT0123456789ABCDEF',
      bankName: 'QA Bank',
      accountName: 'Studio',
      accountNumber: '00000000',
      amount: 207000,
      depositRequired: 207000,
      expiresAt: '2026-11-12T07:00:02Z',
      status: 'pending',
      qrUrl: '/qa-qr.png',
      downloadUrl: '/qa-qr.png',
      demoSimulation: false,
    },
    quoteHistory: [],
    readyForHandover: false,
    returns: [],
    change: null,
    events: [],
    createdAt: '2026-11-12T07:00:00Z',
    updatedAt: '2026-11-12T07:00:00Z',
  };
}
async function open(order: RentalOrder, search = '?payment=deposit') {
  vi.mocked(rentalService.get).mockResolvedValue(order);
  render(
    <CustomerAppearanceContext.Provider value={true}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/account/rentals/rental-1',
            search,
            state: { ordersReturnTo: '/account/orders?tab=rentals&page=2&order=rental-1' },
          },
        ]}
      >
        <Routes>
          <Route path="/account/rentals/:id" element={<RentalDetailPage />} />
          <Route path="/rental/start" element={<p>Khôi phục yêu cầu thuê</p>} />
        </Routes>
      </MemoryRouter>
    </CustomerAppearanceContext.Provider>,
  );
  await act(async () => {});
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime('2026-11-12T07:00:00Z');
});
afterEach(() => vi.useRealTimers());

describe('direct rental deposit checkout', () => {
  it('restores the expired order into a fresh rental review when rebooking', async () => {
    const order = { ...fixture(), status: 'expired', note: 'Giữ đủ phụ kiện' };
    await open(order);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại dịch vụ' }));
    expect(screen.getByText('Khôi phục yêu cầu thuê')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).toMatchObject({
      ownerId: 'client',
      contactName: order.contactName,
      phone: order.phone,
      note: order.note,
      receiveDate: '2026-11-21',
      returnDate: '2026-11-22',
      preview: true,
      lines: [{ costumeId: 'costume-1', size: 'M', quantity: '3' }],
    });
    expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).not.toHaveProperty(
      'depositPayment',
    );
  });
  it('opens the QR and countdown directly, without approval or quote acceptance steps', async () => {
    await open(fixture());
    expect(screen.getByRole('heading', { name: 'Thanh toán tiền cọc' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('00:02');
    expect(screen.getByRole('img', { name: /QR thanh toán/ })).toBeInTheDocument();
    expect(
      screen.getByText('Tiền cọc cần thanh toán').parentElement!.parentElement,
    ).toHaveTextContent('207.000');
    expect(screen.getByText('Còn lại sau cọc').parentElement).toHaveTextContent('483.000');
    expect(screen.queryByText('Chờ xác nhận')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tiến độ đơn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đồng ý báo giá/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đơn của tôi' })).toHaveAttribute(
      'href',
      '/account/orders?tab=rentals&page=2&order=rental-1',
    );
  });
  it('expires the payment on screen before the next poll and removes its QR', async () => {
    await open(fixture());
    act(() => vi.advanceTimersByTime(2000));
    expect(
      screen.getByRole('heading', { name: 'Phiên thanh toán đã hết hạn' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tải QR về điện thoại' })).not.toBeInTheDocument();
  });
  it('updates to the confirmed screen after the payment poll without another approval', async () => {
    const order = fixture();
    await open(order);
    vi.mocked(rentalService.get).mockResolvedValue({
      ...order,
      status: 'confirmed',
      changesLocked: true,
      depositPayment: {
        ...order.depositPayment!,
        status: 'paid',
        amount: 0,
        qrUrl: null,
        downloadUrl: null,
      },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByRole('heading', { name: 'Đã nhận tiền cọc' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Xem hồ sơ đơn thuê' }));
    expect(screen.getByRole('region', { name: 'Tiến độ đơn' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Thanh toán tiền cọc' })).not.toBeInTheDocument();
  });
  it('keeps the payment screen and deadline when QR is not configured', async () => {
    await open({ ...fixture(), depositPayment: null });
    expect(screen.getByRole('timer')).toHaveTextContent('00:02');
    expect(screen.getByText(/Hiện chưa có thanh toán QR/)).toBeInTheDocument();
    expect(screen.queryByText('Chờ xác nhận')).not.toBeInTheDocument();
  });
  it('leaves existing manual orders on their full profile', async () => {
    await open({ ...fixture(), autoCheckout: false, status: 'quoting', depositPayment: null });
    expect(screen.getByRole('region', { name: 'Tiến độ đơn' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Thanh toán tiền cọc' })).not.toBeInTheDocument();
  });
});
