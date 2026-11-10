import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DepositPaymentPanel } from './DepositPaymentPanel';
import type { DepositPayment } from '../../services/bookingWorkflowService';
const mocks = vi.hoisted(() => ({ simulate: vi.fn() }));
vi.mock('../../services/paymentService', () => ({
  paymentService: { simulateDeposit: mocks.simulate },
}));
beforeEach(() => mocks.simulate.mockReset());

const fixture = (): DepositPayment => ({
  provider: 'sepay',
  mode: 'sandbox',
  reference: 'YUME0123456789ABCDEF',
  bankName: 'MBBank',
  accountName: 'YUME STUDIO',
  accountNumber: 'SBSTUDIO001',
  amount: 2250000,
  depositRequired: 2250000,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  status: 'pending',
  qrUrl: 'https://vietqr.app/img?amount=2250000&des=YUME0123456789ABCDEF',
  downloadUrl: 'https://vietqr.app/img?amount=2250000&download=true',
});
afterEach(() => vi.useRealTimers());
describe('deposit QR presentation', () => {
  it('offers local simulation only with explicit sandbox capability and prevents double clicks', async () => {
    mocks.simulate.mockResolvedValue({ status: 'applied' });
    render(<DepositPaymentPanel payment={{ ...fixture(), demoSimulation: true }} />);
    const button = screen.getByRole('button', { name: 'Thanh toán thử' });
    expect(
      screen.queryByText(/Chế độ thử nghiệm|Demo local|mô phỏng|Trang tự cập nhật sau khi bạn bấm/),
    ).not.toBeInTheDocument();
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText('Đã ghi nhận thanh toán.');
    expect(mocks.simulate).toHaveBeenCalledTimes(1);
    expect(mocks.simulate).toHaveBeenCalledWith(fixture().reference, expect.any(String));
    expect(button).toBeDisabled();
  });
  it('retains the same request key when retrying a failed local simulation', async () => {
    mocks.simulate
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ status: 'applied' });
    render(<DepositPaymentPanel payment={{ ...fixture(), demoSimulation: true }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán thử' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán thử' }));
    await screen.findByText('Đã ghi nhận thanh toán.');
    expect(mocks.simulate.mock.calls[0][1]).toBe(mocks.simulate.mock.calls[1][1]);
  });
  it('never offers simulation for a live payment even if the capability is spoofed', () => {
    render(<DepositPaymentPanel payment={{ ...fixture(), mode: 'live', demoSimulation: true }} />);
    expect(screen.queryByRole('button', { name: 'Thanh toán thử' })).not.toBeInTheDocument();
  });
  it('shows payment details, copy and download without extra mode notices or a payment confirmation button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<DepositPaymentPanel payment={fixture()} />);
    expect(screen.getByRole('img', { name: 'Mã QR thanh toán tiền cọc' })).toHaveAttribute(
      'src',
      fixture().qrUrl,
    );
    expect(screen.queryByText(/Chế độ thử nghiệm|mô phỏng/)).not.toBeInTheDocument();
    expect(screen.getByText('2.250.000 đ')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tải QR về điện thoại' })).toHaveAttribute(
      'href',
      fixture().downloadUrl,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép nội dung' }));
    expect(writeText).toHaveBeenCalledWith('YUME0123456789ABCDEF');
    expect(screen.queryByRole('button', { name: /đã thanh toán/i })).not.toBeInTheDocument();
  });
  it.each(['paid', 'expired'] as const)('does not show a payable QR when %s', (status) => {
    render(
      <DepositPaymentPanel payment={{ ...fixture(), status, qrUrl: null, downloadUrl: null }} />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      status === 'paid' ? 'Đã nhận cọc — lịch đã được xác nhận.' : 'Đã hết thời hạn',
    );
  });
  it('hides QR at the deadline without waiting for a server poll', async () => {
    vi.useFakeTimers();
    render(
      <DepositPaymentPanel
        payment={{ ...fixture(), expiresAt: new Date(Date.now() + 1000).toISOString() }}
      />,
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('keeps transfer details readable when the QR image fails', () => {
    render(<DepositPaymentPanel payment={fixture()} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa tải được ảnh QR');
    expect(screen.getByText('SBSTUDIO001')).toBeInTheDocument();
  });
});
