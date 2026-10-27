import { useEffect, useState } from 'react';
import type { BookingCostumeHold, BookingCostumeSelection } from '@/services/bookingService';

const day = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const time = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export function BookingCostumeSummary({
  selections = [],
  hold,
}: {
  selections?: BookingCostumeSelection[];
  hold?: BookingCostumeHold | null;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (hold?.status !== 'temporary') return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [hold?.status]);
  if (!selections.length) return <p>Chưa chọn trang phục · Studio sẽ tư vấn sau.</p>;
  const status =
    hold?.status === 'temporary' && hold.expiresAt && Date.parse(hold.expiresAt) <= now
      ? 'expired'
      : hold?.status;
  return (
    <div className="space-y-2">
      <ul>
        {selections.map((row) => (
          <li key={`${row.costumeId}:${row.size}`}>
            {row.typeName} · {row.name} · Size {row.size} × {row.quantity}
          </li>
        ))}
      </ul>
      {hold && (
        <p>
          Khoảng ngày giữ: {day(hold.receiveDate)} – {day(hold.returnDate)} (giờ Việt Nam)
        </p>
      )}
      {status === 'temporary' && hold?.expiresAt && (
        <p>Đang giữ tạm đến {time(hold.expiresAt)}. Studio duyệt sẽ tiếp tục giữ.</p>
      )}
      {status === 'expired' && (
        <p role="status">Đã hết hạn giữ tạm. Studio cần kiểm tra lại kho khi duyệt.</p>
      )}
      {status === 'approved' && <p>Studio đã duyệt và đang giữ trang phục đến khi chốt lịch.</p>}
      {status === 'released' && (
        <p>Đã bỏ giữ trang phục.{hold?.releaseReason && ` Lý do: ${hold.releaseReason}`}</p>
      )}
      {status === 'transferred' && <p>Đã chuyển phần giữ sang lịch chụp chính thức.</p>}
    </div>
  );
}
