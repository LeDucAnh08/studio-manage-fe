import type { ConceptOrder } from '../../services/conceptService';
import { CustomerOrderProgress } from './CustomerOrdersWorkspace';
import '../../styles/customer-orders-workspace.css';

export function ConceptOrderProgress({ order }: { order: ConceptOrder }) {
  const stage =
    order.orderStage ||
    (
      {
        confirmed: 'deposited',
        shot: 'handing_over',
        completed: 'completed',
        cancelled: 'cancelled',
        expired: 'cancelled',
      } as Record<string, string>
    )[order.status];
  const cancelled = stage === 'cancelled';
  const completed = stage === 'completed';
  const deposit = order.payments?.find((payment) => payment.kind === 'deposit');
  const eventAt = (action: string) =>
    [...order.events].reverse().find((event) => event.action === action)?.at;
  const currentStep = !stage ? -1 : stage === 'deposited' ? 0 : stage === 'handing_over' ? 1 : 2;
  const stages = [
    {
      label: 'Đã cọc',
      done: cancelled ? !!deposit : currentStep > 0 || completed,
      at: deposit?.at || null,
      description:
        'Lịch chụp đã được xác nhận. Studio sẽ chuẩn bị buổi chụp theo thông tin của bạn.',
    },
    {
      label: 'Đang bàn giao',
      done: cancelled ? !!eventAt('shot') : completed,
      at: eventAt('shot'),
      description: 'Theo dõi album, chọn ảnh và trao đổi chỉnh sửa với studio trong hồ sơ.',
    },
    {
      label: 'Hoàn thành',
      done: completed,
      at: completed ? eventAt('album.accept') || null : undefined,
    },
  ];
  if (cancelled)
    stages.push({
      label: 'Hủy',
      done: true,
      at: eventAt('cancel') || eventAt('exception-cancel') || eventAt('expired') || null,
    });
  return <CustomerOrderProgress stages={stages} currentStep={currentStep} terminal={cancelled} />;
}
