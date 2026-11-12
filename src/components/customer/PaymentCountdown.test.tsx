import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentCountdown } from './PaymentCountdown';
import { usePaymentClock } from './usePaymentClock';

const start = Date.parse('2026-11-12T07:00:00Z');
function Countdown({ expiresAt }: { expiresAt: string }) {
  return <PaymentCountdown expiresAt={expiresAt} now={usePaymentClock()} />;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
});
afterEach(() => vi.useRealTimers());
describe('payment countdown', () => {
  it.each([
    [900000, '15:00'],
    [3600000, '01:00:00'],
    [90061000, '25:01:01'],
    [1, '00:01'],
    [-1000, '00:00'],
  ])('formats %i ms left without negative time', (duration, digits) => {
    render(<Countdown expiresAt={new Date(start + Number(duration)).toISOString()} />);
    expect(screen.getByRole('timer')).toHaveTextContent(String(digits));
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  });
  it('counts down against the deadline and preserves it across refreshed props', () => {
    const expiresAt = new Date(start + 900000).toISOString();
    const { rerender } = render(<Countdown expiresAt={expiresAt} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('timer')).toHaveTextContent('14:55');
    rerender(<Countdown expiresAt={expiresAt} />);
    expect(screen.getByRole('timer')).toHaveTextContent('14:55');
    rerender(<Countdown expiresAt={new Date(Date.now() + 120000).toISOString()} />);
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
  });
  it('resynchronizes after a suspended tab and clamps an expired payment to zero', () => {
    render(<Countdown expiresAt={new Date(start + 900000).toISOString()} />);
    vi.setSystemTime(start + 901000);
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(screen.getByText('Đã hết thời hạn thanh toán')).toBeInTheDocument();
  });
  it('highlights the final minute and tolerates an invalid deadline', () => {
    const { rerender } = render(<Countdown expiresAt={new Date(start + 61000).toISOString()} />);
    expect(document.querySelector('.is-urgent')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(document.querySelector('.is-urgent')).toBeInTheDocument();
    rerender(<Countdown expiresAt="invalid" />);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
