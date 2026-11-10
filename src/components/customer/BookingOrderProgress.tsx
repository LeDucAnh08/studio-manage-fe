import {
  bookingOrderStageLabels,
  bookingWorkflowLabels,
  getBookingOrderStage,
  type BookingWorkflowDto,
} from '@/services/bookingWorkflowService';
import { CustomerOrderProgress } from './CustomerOrdersWorkspace';
import '../../styles/customer-orders-workspace.css';

const stages = [
  'pending',
  'awaiting_confirmation',
  'confirmed',
  'active',
  'delivered',
  'completed',
] as const;

export function BookingOrderProgress({ record }: { record: BookingWorkflowDto }) {
  const { booking, workflow } = record;
  const stage = getBookingOrderStage(booking.status, workflow.lifecycle, workflow.orderStage);
  const terminal = stage === 'cancelled' || stage === 'rejected';
  const current = stages.findIndex((value) => value === stage);
  const eventAt = (...actions: string[]) =>
    workflow.events
      .filter((event) => actions.includes(event.action))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]?.at;
  const reached = terminal
    ? workflow.progress?.deliveredAt
      ? 4
      : workflow.progress && workflow.progress.status !== 'not_started'
        ? 3
        : workflow.resources?.scheduleId || eventAt('resources.confirm', 'resources.confirmed')
          ? 2
          : workflow.quote
            ? 1
            : 0
    : current;
  const dates = [
    booking.createdAt || eventAt('intake.received', 'workflow.created') || workflow.createdAt,
    eventAt('package.approve', 'quote.propose') ||
      workflow.quote?.proposedAt ||
      (booking.status === 'approved' ? booking.reviewedAt : undefined),
    eventAt('resources.confirm', 'resources.confirmed'),
    eventAt('progress.update'),
    workflow.progress?.deliveredAt,
    eventAt('workflow.completed'),
  ];
  const descriptions = {
    pending: 'Studio đang kiểm tra và phản hồi yêu cầu của lớp.',
    awaiting_confirmation:
      workflow.lifecycle === 'quoting'
        ? 'Xem và xác nhận báo giá trong hồ sơ.'
        : 'Hoàn tất tiền cọc và xác nhận lịch với studio.',
    confirmed:
      'Ekip và lịch chụp đã được xác nhận. Hoàn thiện danh sách thành viên trước buổi chụp.',
    active:
      workflow.lifecycle === 'change_pending'
        ? 'Studio đang xử lý yêu cầu thay đổi.'
        : bookingWorkflowLabels[workflow.lifecycle],
    delivered:
      workflow.lifecycle === 'accepted'
        ? 'Bạn đã xác nhận ảnh đạt yêu cầu. Hoàn tất các khoản thanh toán còn lại.'
        : 'Xem ảnh bàn giao, gửi phản hồi hoặc xác nhận ảnh đạt yêu cầu trong hồ sơ.',
    completed: 'Ảnh đã được xác nhận đạt yêu cầu và các khoản thanh toán đã hoàn tất.',
  };
  return (
    <div>
      <CustomerOrderProgress
        currentStep={current}
        terminal={terminal}
        stages={stages.map((value, index) => ({
          label: bookingOrderStageLabels[value],
          done: terminal ? index <= reached : index < current || stage === 'completed',
          at: index <= reached ? dates[index] || null : undefined,
          description: value === stage ? descriptions[value] : undefined,
        }))}
      />
      {terminal && (
        <p role="status" className="mt-3 text-sm font-medium">
          {bookingOrderStageLabels[stage]}
        </p>
      )}
    </div>
  );
}
