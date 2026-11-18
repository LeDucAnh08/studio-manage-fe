import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  History,
  MapPin,
  Phone,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui';
import {
  bookingOrderStageLabels,
  getBookingOrderStage,
  type BookingOrderStage,
  type BookingWorkflowDto,
} from '../services/bookingWorkflowService';
import { AdminOrderSteps, AdminOrderTabs } from './AdminOrderLayout';

const labels = {
  overview: 'Tổng quan',
  schedule: 'Lịch & ekip',
  students: 'Học sinh',
  payments: 'Thanh toán',
  delivery: 'Bàn giao',
  history: 'Lịch sử',
};
type Tab = keyof typeof labels;
type OrderTask = { title: string; text: string; action: { tab: Tab; label: string } };

const milestones = ['Tiếp nhận', 'Chốt lịch', 'Chụp ảnh', 'Hậu kỳ', 'Bàn giao'];
const milestoneIndex: Record<BookingOrderStage, number> = {
  pending: 0,
  awaiting_confirmation: 1,
  confirmed: 1,
  active: 2,
  editing: 3,
  delivered: 4,
  completed: 4,
  rejected: -1,
  cancelled: -1,
};

interface Props {
  record: BookingWorkflowDto;
  tab: string;
  onTabChange: (tab: string) => void;
  title: string;
  now: number;
  canEditMembers: boolean;
  canConfirmResources: boolean;
  canQuote: boolean;
  timeline: Array<{ action: string; message: string; at: string }>;
  panels: Record<Exclude<Tab, 'overview'>, ReactNode>;
  formatDate: (value?: string | Date) => string;
  formatTime: (value?: string | Date) => string;
}

export function AdminYearbookOrder({
  record,
  tab,
  onTabChange,
  title,
  now,
  canEditMembers,
  canConfirmResources,
  canQuote,
  timeline,
  panels,
  formatDate,
  formatTime,
}: Props) {
  const { booking, workflow } = record;
  const stage = getBookingOrderStage(
    booking.status,
    workflow.lifecycle,
    workflow.orderStage,
    workflow.shootWindow,
    now,
  );
  const current = milestoneIndex[stage];
  const confirmed = workflow.resources?.scheduleDetails;
  const schedule = confirmed ?? workflow.proposedSchedule ?? workflow.quote?.proposedSchedule;
  const members = workflow.members.length;
  const missing = Math.max(0, booking.members - members);
  const payments = workflow.payments;
  const orderTotal =
    workflow.changeRequest?.status === 'applied'
      ? (workflow.changeRequest.finalPayable ??
        workflow.quote?.total ??
        booking.packageAgreement?.total)
      : (workflow.quote?.total ?? booking.packageAgreement?.total);
  const nextTask = getNextTask(
    stage,
    record,
    { canEditMembers, canConfirmResources, canQuote },
    missing,
  );
  const formatMoney = (value: number) => value.toLocaleString('vi-VN') + ' đ';
  return (
    <div className="admin-order admin-yearbook">
      <header className="admin-order__header">
        <p className="admin-order__kicker">Hồ sơ chụp kỉ yếu</p>
        <h1>{title}</h1>
        <div className="admin-order__meta">
          <span>
            {[booking.school, '#' + booking._id.slice(-6).toUpperCase()]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span
            className={`admin-order__status staff-status--${current < 0 ? 'danger' : stage === 'pending' || stage === 'awaiting_confirmation' ? 'warning' : 'success'}`}
          >
            {bookingOrderStageLabels[stage]}
          </span>
        </div>
      </header>
      <AdminOrderSteps
        milestones={milestones}
        current={current}
        completed={stage === 'completed'}
      />
      <AdminOrderTabs
        labels={labels}
        value={tab}
        onChange={onTabChange}
        panels={panels}
        overview={(openTab) => (
          <div className="admin-order__overview">
            <section className="admin-order__card">
              <div className="admin-order__heading">
                <h2>Lịch chụp & ekip</h2>
                <button
                  type="button"
                  className="admin-order__text-button"
                  onClick={() => openTab('schedule')}
                >
                  Xem chi tiết <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="admin-order__schedule">
                <div>
                  <CalendarDays aria-hidden="true" />
                  <span>
                    <strong>{formatDate(schedule?.shootDate ?? booking.startAt)}</strong>
                    <small>
                      {schedule?.startTime && schedule.endTime
                        ? `${schedule.startTime} – ${schedule.endTime}`
                        : `${formatClock(booking.startAt)} – ${formatClock(booking.endAt)}`}
                    </small>
                    <small>
                      {confirmed
                        ? current < 0
                          ? 'Lịch đã hủy'
                          : 'Lịch đã xác nhận'
                        : 'Lịch dự kiến'}
                    </small>
                  </span>
                </div>
                <div>
                  <MapPin aria-hidden="true" />
                  <span>{schedule?.location || booking.location || 'Chưa có địa điểm'}</span>
                </div>
              </div>
              <dl className="admin-order__facts">
                <div>
                  <dt>
                    <UserRound size={17} aria-hidden="true" /> Thợ chính
                  </dt>
                  <dd>{workflow.assignedPhotographer?.name || 'Chưa phân công'}</dd>
                </div>
                <div>
                  <dt>
                    <Users size={17} aria-hidden="true" /> Hỗ trợ
                  </dt>
                  <dd>
                    {workflow.assignedSupportPhotographers
                      ?.map((person) => person.name)
                      .join(', ') || 'Chưa phân công'}
                  </dd>
                </div>
              </dl>
              <div className="admin-order__class">
                <h2>Thông tin lớp</h2>
                <dl className="admin-order__facts">
                  <div>
                    <dt>
                      <UserRound size={17} aria-hidden="true" /> Người liên hệ
                    </dt>
                    <dd>{booking.contactName || '—'}</dd>
                  </div>
                  <div>
                    <dt>
                      <Phone size={17} aria-hidden="true" /> Điện thoại
                    </dt>
                    <dd>
                      {booking.phone ? <a href={`tel:${booking.phone}`}>{booking.phone}</a> : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Users size={17} aria-hidden="true" /> Học sinh
                    </dt>
                    <dd>
                      {members} / {booking.members} đã khai báo
                    </dd>
                  </div>
                  <div>
                    <dt>Gói dịch vụ</dt>
                    <dd>{booking.packageName}</dd>
                  </div>
                </dl>
                {booking.note && <p className="admin-order__note">{booking.note}</p>}
              </div>
            </section>
            <aside className="admin-order__card admin-order__side">
              <section className="admin-order__task">
                <h2>
                  <ClipboardList size={21} aria-hidden="true" /> {nextTask.title}
                </h2>
                <p>{nextTask.text}</p>
                {stage === 'confirmed' && booking.members > 0 && (
                  <>
                    <div className="admin-order__meter-label">
                      <span>
                        {members} / {booking.members}
                      </span>
                      <span>{Math.min(100, Math.round((members / booking.members) * 100))}%</span>
                    </div>
                    <progress
                      aria-label="Số học sinh đã khai báo"
                      value={Math.min(members, booking.members)}
                      max={booking.members}
                    />
                    <small>
                      {missing > 0
                        ? `Còn ${missing} học sinh chưa khai báo.`
                        : 'Đã khai báo đủ số học sinh.'}
                    </small>
                  </>
                )}
                <Button type="button" onClick={() => openTab(nextTask.action.tab)}>
                  {nextTask.action.label}
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </section>
              {(orderTotal !== undefined || payments) && (
                <dl className="admin-order__amounts">
                  {orderTotal !== undefined && (
                    <div>
                      <dt>Tổng giá trị đơn</dt>
                      <dd>{formatMoney(orderTotal)}</dd>
                    </div>
                  )}
                  {payments && (
                    <>
                      <div>
                        <dt>Đã thu</dt>
                        <dd>{formatMoney(payments.totalReceived)}</dd>
                      </div>
                      {!!payments.totalRefunded && (
                        <div>
                          <dt>Đã hoàn</dt>
                          <dd>{formatMoney(payments.totalRefunded)}</dd>
                        </div>
                      )}
                      <div>
                        <dt>{payments.refundDue ? 'Cần hoàn' : 'Còn phải thu'}</dt>
                        <dd>{formatMoney(payments.refundDue || payments.totalDue)}</dd>
                      </div>
                    </>
                  )}
                </dl>
              )}
              <section className="admin-order__recent">
                <h2>
                  <History size={19} aria-hidden="true" /> Hoạt động gần đây
                </h2>
                {timeline.length ? (
                  <ol>
                    {timeline.slice(0, 2).map((event, index) => (
                      <li key={`${event.action}-${event.at}-${index}`}>
                        <time dateTime={event.at}>{formatTime(event.at)}</time>
                        <p>{event.message}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Chưa có cập nhật.</p>
                )}
              </section>
            </aside>
          </div>
        )}
      />
    </div>
  );
}

const shootClock = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});
function formatClock(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? shootClock.format(timestamp) : '—';
}

function getNextTask(
  stage: BookingOrderStage,
  { booking, workflow }: BookingWorkflowDto,
  {
    canEditMembers,
    canConfirmResources,
    canQuote,
  }: Pick<Props, 'canEditMembers' | 'canConfirmResources' | 'canQuote'>,
  missing: number,
): OrderTask {
  if (stage === 'cancelled' || stage === 'rejected') {
    return {
      title: 'Hồ sơ đã đóng',
      text:
        booking.cancellationReason || booking.reviewNote || 'Xem các cập nhật trong lịch sử xử lý.',
      action: { tab: 'history', label: 'Xem lịch sử' },
    };
  }
  if (stage === 'pending') {
    return {
      title: 'Xét duyệt yêu cầu',
      text: 'Kiểm tra lịch dự kiến và ekip trước khi phản hồi cho khách.',
      action: { tab: 'schedule', label: 'Xử lý yêu cầu' },
    };
  }
  if (canQuote) {
    return {
      title: 'Chuẩn bị báo giá',
      text: 'Lập báo giá và đề xuất lịch để khách xác nhận.',
      action: { tab: 'schedule', label: 'Lập báo giá' },
    };
  }
  if (canConfirmResources) {
    return {
      title: 'Chốt lịch chụp',
      text: 'Kiểm tra ekip và phân bổ nguồn lực cho buổi chụp.',
      action: { tab: 'schedule', label: 'Xác nhận lịch' },
    };
  }
  if (stage === 'awaiting_confirmation') {
    return workflow.quote && !workflow.quote.acceptedAt
      ? {
          title: 'Chờ khách xác nhận',
          text: 'Khách cần đồng ý báo giá trước khi studio ghi nhận cọc.',
          action: { tab: 'schedule', label: 'Xem báo giá' },
        }
      : {
          title: 'Theo dõi tiền cọc',
          text: 'Kiểm tra khoản cọc và thời hạn giữ lịch trong hồ sơ.',
          action: { tab: 'payments', label: 'Xem thanh toán' },
        };
  }
  if (stage === 'confirmed') {
    return {
      title: 'Chuẩn bị trước buổi chụp',
      text: missing
        ? 'Kiểm tra danh sách học sinh trước buổi chụp.'
        : 'Kiểm tra ekip và trang phục trước buổi chụp.',
      action: missing
        ? { tab: 'students', label: canEditMembers ? 'Hoàn thiện danh sách' : 'Xem danh sách' }
        : { tab: 'schedule', label: 'Xem lịch & ekip' },
    };
  }
  return {
    title: stage === 'completed' ? 'Đơn đã hoàn tất' : 'Theo dõi chụp và bàn giao',
    text:
      stage === 'completed'
        ? 'Xem lại kết quả và các cập nhật của đơn.'
        : 'Xem tiến độ và thao tác bàn giao trong hồ sơ.',
    action: { tab: 'delivery', label: 'Xem bàn giao' },
  };
}
