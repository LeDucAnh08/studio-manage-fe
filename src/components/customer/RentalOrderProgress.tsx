import { getRentalStage, rentalStageLabels, type RentalOrder } from '../../services/rentalService';
import { CustomerOrderProgress } from './CustomerOrdersWorkspace';
import '../../styles/customer-orders-workspace.css';

const stages = [
  'awaiting_confirmation',
  'ready_for_pickup',
  'renting',
  'settling',
  'completed',
] as const;

export function RentalOrderProgress({ order }: { order: RentalOrder }) {
  const stage = getRentalStage(order);
  const terminal = stage === 'cancelled';
  const current = stages.findIndex((value) => value === stage);
  const eventAt = (...actions: string[]) =>
    [...order.events]
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .find((event) => actions.includes(event.action))?.at;
  const reached = terminal
    ? order.returnedAt
      ? 3
      : order.checkedOutAt
        ? 2
        : eventAt('resources.confirm')
          ? 1
          : 0
    : current;
  const completedAt = [...order.events]
    .reverse()
    .find((event) =>
      ['completed', 'settlement.accept', 'payment.record'].includes(event.action),
    )?.at;
  const dates = [
    order.createdAt,
    eventAt('resources.confirm'),
    order.checkedOutAt,
    order.returnedAt,
    completedAt,
  ];
  const descriptions = {
    awaiting_confirmation:
      order.status === 'payment_review'
        ? 'Studio đang kiểm tra khoản thanh toán và khả năng giữ trang phục.'
        : order.status === 'ready_to_confirm'
          ? 'Đã đủ điều kiện cọc. Studio đang xác nhận giữ trang phục.'
          : order.autoCheckout
            ? 'Hoàn tất tiền cọc để xác nhận giữ trang phục.'
            : 'Thống nhất thông tin thuê và hoàn tất tiền cọc với studio.',
    ready_for_pickup: 'Trang phục đã được giữ. Nhận đồ theo ngày đã hẹn.',
    renting: 'Bạn đã nhận trang phục. Trả đồ theo kỳ thuê đã thống nhất.',
    settling: 'Studio kiểm tra đồ trả và đối soát các khoản thanh toán.',
    completed: 'Giao nhận và các khoản thanh toán đã hoàn tất.',
  };
  return (
    <div>
      <CustomerOrderProgress
        currentStep={current}
        terminal={terminal}
        stages={stages.map((value, index) => ({
          label: rentalStageLabels[value],
          done: terminal ? index <= reached : index < current || stage === 'completed',
          at: index <= reached ? dates[index] || null : undefined,
          description: value === stage ? descriptions[value] : undefined,
        }))}
      />
      {terminal && (
        <p role="status" className="mt-3 text-sm font-medium">
          {order.status === 'expired'
            ? 'Đơn đã hết hạn thanh toán cọc.'
            : order.status === 'rejected'
              ? 'Studio đã từ chối yêu cầu thuê.'
              : 'Đơn thuê đã được hủy.'}
        </p>
      )}
    </div>
  );
}
