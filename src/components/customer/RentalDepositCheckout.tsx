import type { RentalOrder } from '@/services/rentalService';
import { rentalDate } from '@/services/rentalService';
import { DepositCheckout } from './DepositCheckout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { rentalDraftFromOrder, writeRentalDraft } from '../../services/rentalDraft';

export function RentalDepositCheckout({
  order,
  balance = false,
  returnTo,
  error,
  loading,
  onReload,
}: {
  order: RentalOrder;
  balance?: boolean;
  returnTo: string;
  error: string;
  loading: boolean;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quote = order.quote;
  const advance = quote?.depositKind === 'advance';
  const lines = quote?.lines || order.requestedLines;
  const fee = quote?.fee ?? 0;
  const deposit = quote?.deposit ?? order.depositPayment?.depositRequired ?? 0;
  const payment = balance ? order.balancePayment : order.depositPayment;
  const paid = balance
    ? payment?.status === 'paid'
    : ['confirmed', 'checked_out', 'returned', 'completed'].includes(order.status);
  const profileTo = `/account/rentals/${order._id}`;
  const profileState = { ordersReturnTo: returnTo };
  return (
    <DepositCheckout
      service="rental"
      purpose={balance ? 'balance' : undefined}
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
      remaining={
        balance
          ? paid
            ? 0
            : (payment?.amount ?? order.payment?.due ?? fee)
          : advance
            ? Math.max(0, fee - deposit)
            : fee
      }
      remainingNote="Thanh toán trước khi nhận trang phục."
      confirmation={
        balance
          ? paid
            ? 'Đơn đã thanh toán đủ. Bạn có thể nhận trang phục theo lịch đã chốt.'
            : 'SePay sẽ tự cập nhật đơn sau khi nhận được tiền.'
          : paid
            ? 'Trang phục đã được giữ theo kỳ thuê của bạn.'
            : 'Trang phục được giữ ngay khi hệ thống nhận đủ cọc trong hạn.'
      }
      payment={payment}
      deadline={balance ? undefined : order.reservation?.expiresAt}
      state={
        ['cancelled', 'rejected'].includes(order.status)
          ? 'cancelled'
          : order.status === 'payment_review' || (balance && order.balancePayment?.requiresReview)
            ? 'review'
            : paid
              ? 'paid'
              : order.status === 'expired'
                ? 'expired'
                : undefined
      }
      backTo={balance ? profileTo : returnTo}
      backLabel={balance ? 'Quay lại chi tiết đơn thuê' : 'Đơn của tôi'}
      backState={balance ? profileState : undefined}
      profileTo={profileTo}
      profileLabel="Xem hồ sơ đơn thuê"
      profileState={profileState}
      restartTo="/costumes"
      onRestart={
        user && !balance
          ? () => {
              const rentalDraft = rentalDraftFromOrder(order, user._id);
              writeRentalDraft(rentalDraft);
              navigate('/rental/start', { state: { rentalDraft } });
            }
          : undefined
      }
      error={error}
      notice={order.reservationIssue}
      loading={loading}
      onReload={onReload}
    />
  );
}
