import { Timer } from 'lucide-react';
import '../../styles/payment-countdown.css';

export function PaymentCountdown({ expiresAt, now }: { expiresAt: string; now: number }) {
  const deadline = Date.parse(expiresAt);
  if (!Number.isFinite(deadline)) return null;
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const digits = [...(hours ? [hours] : []), minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  return (
    <div
      className={`payment-countdown${remaining === 0 ? ' is-expired' : remaining <= 60 ? ' is-urgent' : ''}`}
    >
      <span className="payment-countdown__label">
        <Timer size={20} aria-hidden="true" />
        {remaining === 0 ? 'Đã hết thời hạn thanh toán' : 'Thời gian thanh toán còn lại'}
      </span>
      <span
        className="payment-countdown__value"
        role="timer"
        aria-live="off"
        aria-label="Thời gian thanh toán còn lại"
      >
        {digits}
      </span>
    </div>
  );
}
