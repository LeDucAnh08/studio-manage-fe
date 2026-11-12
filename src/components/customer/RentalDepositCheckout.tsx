import type { RentalOrder } from '@/services/rentalService';
import { rentalDate } from '@/services/rentalService';
import { DepositCheckout } from './DepositCheckout';

export function RentalDepositCheckout({
  order,
  returnTo,
  error,
  loading,
  onReload,
}: {
  order: RentalOrder;
  returnTo: string;
  error: string;
  loading: boolean;
  onReload: () => void;
}) {
  const quote = order.quote;
  const advance = quote?.depositKind === 'advance';
  const lines = quote?.lines || order.requestedLines;
  const fee = quote?.fee ?? 0;
  const deposit = quote?.deposit ?? order.depositPayment?.depositRequired ?? 0;
  const paid = ['confirmed', 'checked_out', 'returned', 'completed'].includes(order.status);
  return (
    <DepositCheckout
      service="rental"
      orderId={order._id}
      title={lines.map((line) => line.name).join(', ')}
      description={
        lines.map((line) => `${line.quantity} bộ · Cỡ ${line.size}`).join(' / ') +
        (quote?.rentalDays ? ` · ${quote.rentalDays} ngày thuê` : '')
      }
      fields={[
        ['Ngày nhận', rentalDate(quote?.receiveDate || order.requestedReceiveDate)],
        ['Ngày trả', rentalDate(quote?.returnDate || order.requestedReturnDate)],
        ['Nhận & trả tại', 'Yume Studio'],
        ['Người liên hệ', order.contactName],
      ]}
      total={advance ? fee : fee + deposit}
      totalLabel={advance ? 'Tổng tiền thuê' : 'Tiền thuê & cọc bảo đảm'}
      deposit={deposit}
      depositNote={
        advance
          ? `Cọc trước ${quote?.depositPercent ?? 30}% · Được trừ vào tiền thuê`
          : 'Cọc bảo đảm theo thỏa thuận đã lưu'
      }
      remaining={advance ? Math.max(0, fee - deposit) : fee}
      remainingNote="Thanh toán trước khi nhận trang phục."
      confirmation={
        paid
          ? 'Trang phục đã được giữ theo kỳ thuê của bạn.'
          : 'Trang phục được giữ ngay khi hệ thống nhận đủ cọc trong hạn.'
      }
      payment={order.depositPayment}
      deadline={order.reservation?.expiresAt}
      state={
        ['cancelled', 'rejected'].includes(order.status)
          ? 'cancelled'
          : order.status === 'payment_review'
            ? 'review'
            : paid
              ? 'paid'
              : order.status === 'expired'
                ? 'expired'
                : undefined
      }
      backTo={returnTo}
      backLabel="Đơn của tôi"
      profileTo={`/account/rentals/${order._id}`}
      profileLabel="Xem hồ sơ đơn thuê"
      profileState={{ ordersReturnTo: returnTo }}
      restartTo="/costumes"
      error={error}
      notice={order.reservationIssue}
      loading={loading}
      onReload={onReload}
    />
  );
}
