import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DepositCheckout, type DepositCheckoutProps } from './DepositCheckout';
import { paymentService } from '../../services/paymentService';

vi.mock('../../services/paymentService', () => ({ paymentService: { simulateDeposit: vi.fn() } }));

function fixture(): DepositCheckoutProps {
  return {
    service: 'rental',
    orderId: 'order-1',
    title: 'Áo dài',
    description: '3 bộ · Cỡ M',
    fields: [['Người liên hệ', 'Khách hàng']],
    total: 690000,
    totalLabel: 'Tổng tiền thuê',
    deposit: 207000,
    depositNote: 'Cọc trước 30%',
    remaining: 483000,
    remainingNote: 'Thanh toán trước khi nhận đồ.',
    confirmation: 'Đơn được xác nhận khi nhận đủ cọc.',
    backTo: '/account/orders?tab=rentals&page=2',
    profileTo: '/account/rentals/order-1',
    restartTo: '/costumes',
    onReload: vi.fn(),
    payment: {
      provider: 'sepay',
      mode: 'sandbox',
      reference: 'RENT123',
      bankName: 'MBBank',
      accountName: 'Studio',
      accountNumber: '123456',
      amount: 207000,
      depositRequired: 207000,
      expiresAt: '2026-11-12T07:02:00Z',
      status: 'pending',
      qrUrl: '/qr.png',
      downloadUrl: '/qr.png',
    },
  };
}
function view(props: DepositCheckoutProps) {
  return (
    <MemoryRouter>
      <DepositCheckout {...props} />
    </MemoryRouter>
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-11-12T07:00:00Z');
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('shared deposit checkout', () => {
  it.each(['rental', 'concept', 'yearbook'] as const)(
    'uses order payment data for %s without preview controls',
    async (service) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      const props = { ...fixture(), service };
      const page = render(view(props));
      expect(screen.getByRole('img')).toHaveAttribute('src', '/qr.png');
      expect(screen.getByRole('timer')).toHaveTextContent('02:00');
      expect(screen.queryByText(/bản duyệt|minh họa/i)).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Quay lại thông tin đơn' })).toHaveAttribute(
        'href',
        props.backTo,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Sao chép nội dung chuyển khoản' }));
      expect(writeText).toHaveBeenCalledWith('RENT123');
      act(() => vi.advanceTimersByTime(30000));
      page.rerender(view({ ...props }));
      expect(screen.getByRole('timer')).toHaveTextContent('01:30');
      act(() => vi.advanceTimersByTime(90000));
      expect(screen.getByRole('timer')).toHaveTextContent('00:00');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Tải mã QR' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sao chép/ })).not.toBeInTheDocument();
    },
  );
  it('keeps the total deposit separate from the amount remaining on a partial QR', () => {
    const props = fixture();
    render(
      view({
        ...props,
        payment: { ...props.payment!, amount: 107000, qrUrl: '/qr.png?amount=107000' },
      }),
    );
    expect(screen.getByText(/Đã nhận/)).toHaveTextContent('Đã nhận 100.000 ₫');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/qr.png?amount=107000');
    expect(screen.getByText('Tổng tiền cọc').parentElement!.parentElement).toHaveTextContent(
      '207.000',
    );
    expect(screen.getByText('Còn lại sau cọc').parentElement).toHaveTextContent('483.000');
  });
  it.each(['cancelled', 'review', 'expired'] as const)(
    'hides transfer controls for %s even with stale pending payment data',
    (state) => {
      render(view({ ...fixture(), state }));
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sao chép/ })).not.toBeInTheDocument();
    },
  );
  it('uses the earlier hold deadline and fails closed for an invalid payment deadline', () => {
    const props = fixture();
    const page = render(view({ ...props, deadline: '2026-11-12T07:00:01Z' }));
    expect(screen.getByRole('timer')).toHaveTextContent('00:01');
    page.rerender(view({ ...props, payment: { ...props.payment!, expiresAt: 'invalid' } }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('confirms receipt without showing QR or resetting the expired deadline', () => {
    const props = fixture();
    vi.setSystemTime('2026-11-12T08:00:00Z');
    render(
      view({ ...props, state: 'paid', payment: { ...props.payment!, status: 'paid', amount: 0 } }),
    );
    expect(screen.getByRole('heading', { name: 'Đã nhận tiền cọc' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('keeps bank details usable if the QR fails and never enables simulation on the main provider test flow', () => {
    render(view(fixture()));
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa tải được ảnh QR');
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thanh toán' })).not.toBeInTheDocument();
    expect(paymentService.simulateDeposit).not.toHaveBeenCalled();
  });
});
