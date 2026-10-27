import { useState } from 'react';
import { bookingService, type Booking } from '@/services/bookingService';
import { BookingCostumeSummary } from './BookingCostumeSummary';
import { OrderButton, OrderTextarea } from './CustomerOrderControls';

export function BookingCostumeDetails({
  booking,
  admin = false,
  onReleased,
}: {
  booking: Pick<Booking, '_id' | 'costumeSelections' | 'costumeHold'>;
  admin?: boolean;
  onReleased?: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!booking.costumeSelections?.length) return null;
  const releasable =
    admin &&
    !!booking.costumeHold &&
    ['temporary', 'expired', 'approved'].includes(booking.costumeHold.status);
  const release = async () => {
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await bookingService.releaseCostumes(booking._id, reason.trim());
      setReason('');
      await onReleased?.();
    } catch (error) {
      setError(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Chưa bỏ giữ được trang phục. Hãy thử lại.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-2xl border p-5" aria-label="Trang phục đã chọn">
      <h2 className="font-semibold">Trang phục đã chọn</h2>
      <BookingCostumeSummary selections={booking.costumeSelections} hold={booking.costumeHold} />
      {releasable && (
        <div className="space-y-2">
          <label className="block">
            Lý do bỏ giữ trang phục
            <OrderTextarea
              rows={2}
              maxLength={2000}
              value={reason}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <OrderButton
            type="button"
            variant="outline"
            disabled={busy || !reason.trim()}
            onClick={() => void release()}
          >
            {busy ? 'Đang bỏ giữ…' : 'Bỏ giữ trang phục'}
          </OrderButton>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
