import type { ReactNode } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, History } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  getRentalStage,
  rentalLabels,
  rentalMoney,
  rentalReceivedLabel,
  rentalStageLabels,
  type RentalOrder,
  type RentalStage,
} from '../services/rentalService';
import { vietnamCalendarDate, vietnamDisplayDate } from '../utils/vietnamCalendarDate';
import { rentalDayCount } from '../utils/rentalPeriod';
import { AdminOrderSteps, AdminOrderTabs } from './AdminOrderLayout';

const labels = {
  overview: 'Tổng quan',
  items: 'Trang phục',
  payments: 'Thanh toán',
  handover: 'Giao & nhận trả',
  history: 'Lịch sử',
};
const milestones = ['Đặt thuê', 'Giữ hàng', 'Giao đồ', 'Nhận trả', 'Đối soát'];
const steps: Record<RentalStage, number> = {
  awaiting_confirmation: 0,
  ready_for_pickup: 1,
  renting: 2,
  settling: 3,
  completed: 4,
  cancelled: -1,
};
const eventTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});
type Task = {
  title: string;
  text: string;
  label: string;
  tab: Exclude<keyof typeof labels, 'overview'>;
};

export function AdminRentalOrder({
  order,
  tab,
  onTabChange,
  panels,
  balanceLinkAction,
}: {
  order: RentalOrder;
  tab: string;
  onTabChange: (tab: string) => void;
  panels: Record<Exclude<keyof typeof labels, 'overview'>, ReactNode>;
  balanceLinkAction?: ReactNode;
}) {
  const { quote, payment } = order;
  const stage = getRentalStage(order);
  const hasHeldItems =
    stage === 'ready_for_pickup' &&
    !order.reservationIssue &&
    (!order.reservation || order.reservation.status === 'confirmed');
  const hasConfirmedDates =
    ['ready_for_pickup', 'renting', 'settling', 'completed'].includes(stage) && !!quote;
  const receive = quote?.receiveDate ?? order.requestedReceiveDate;
  const returned = quote?.returnDate ?? order.requestedReturnDate;
  const days = rentalDayCount(vietnamCalendarDate(receive), vietnamCalendarDate(returned));
  const lines = quote?.lines ?? order.requestedLines;
  const daily = (quote ? quote.pricingMode : order.pricingMode) === 'daily';
  const billedDays = daily ? (quote?.rentalDays ?? days) : 1;
  const quantity = lines.reduce((total, line) => total + line.quantity, 0);
  const paidDeposits = (order.payments ?? [])
    .filter((entry) => entry.kind === 'deposit')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const depositIsOnlyPayment =
    paidDeposits > 0 &&
    paidDeposits === payment?.netReceived &&
    order.payments?.every((entry) => entry.kind === 'deposit');
  const latest = [...order.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 2);
  const task = getTask(order, stage);

  return (
    <div className="admin-order admin-rental">
      <header className="admin-order__header">
        <p className="admin-order__kicker">Đơn thuê trang phục</p>
        <h1>{order.contactName}</h1>
        <div className="admin-order__meta">
          <span>#{order._id.slice(-6).toUpperCase()}</span>
          <span
            className={`admin-order__status staff-status--${stage === 'cancelled' ? 'danger' : stage === 'completed' ? 'success' : 'warning'}`}
          >
            {rentalLabels[order.status] ?? rentalStageLabels[stage]}
          </span>
          {hasHeldItems && (
            <span className="admin-order__status staff-status--success">Đã giữ hàng</span>
          )}
        </div>
        {order.phone && (
          <p className="admin-rental__contact">
            Liên hệ <a href={`tel:${order.phone}`}>{order.phone}</a>
          </p>
        )}
      </header>
      <AdminOrderSteps
        milestones={milestones}
        current={steps[stage]}
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
              <h2>
                {hasConfirmedDates
                  ? 'Lịch thuê đã chốt'
                  : quote
                    ? 'Lịch theo báo giá'
                    : 'Lịch thuê đề nghị'}
              </h2>
              <div className="admin-order__schedule admin-rental__schedule">
                <div>
                  <CalendarDays aria-hidden="true" />
                  <span>
                    <small>Ngày nhận</small>
                    <strong>{vietnamDisplayDate(receive)}</strong>
                  </span>
                </div>
                {days !== null && <span className="admin-rental__days">{days} ngày thuê</span>}
                <div>
                  <CalendarDays aria-hidden="true" />
                  <span>
                    <small>Ngày trả</small>
                    <strong>{vietnamDisplayDate(returned)}</strong>
                  </span>
                </div>
              </div>
              <div className="admin-order__heading admin-rental__items-heading">
                <h2>{hasHeldItems ? 'Trang phục đã giữ' : 'Trang phục trong đơn'}</h2>
                <button
                  type="button"
                  className="admin-order__text-button"
                  onClick={() => openTab('items')}
                >
                  Xem chi tiết <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
              <div
                className="admin-rental__table-scroll"
                role="region"
                tabIndex={0}
                aria-label="Bảng trang phục"
              >
                <table className="admin-rental__table">
                  <thead>
                    <tr>
                      <th scope="col">Trang phục</th>
                      <th scope="col">Size</th>
                      <th scope="col">Số lượng</th>
                      <th scope="col">{daily ? 'Đơn giá/ngày' : 'Đơn giá'}</th>
                      <th scope="col">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={`${line.costumeId}:${line.size}`}>
                        <th scope="row">{line.name}</th>
                        <td>{line.size}</td>
                        <td>{line.quantity}</td>
                        <td>{line.unitPrice === undefined ? '—' : rentalMoney(line.unitPrice)}</td>
                        <td>
                          {line.unitPrice === undefined || billedDays === null
                            ? '—'
                            : rentalMoney(line.unitPrice * line.quantity * billedDays)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={4}>
                        Tổng số lượng
                      </th>
                      <td>{quantity} món</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {order.note && (
                <p className="admin-order__note">
                  <strong>Ghi chú của khách</strong>
                  <br />
                  {order.note}
                </p>
              )}
            </section>
            <aside className="admin-order__card admin-order__side">
              <section className="admin-order__task">
                <h2>
                  <ClipboardList size={21} aria-hidden="true" /> {task.title}
                </h2>
                <p>{task.text}</p>
                <Button type="button" onClick={() => openTab(task.tab)}>
                  {task.label}
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </section>
              {(quote?.fee !== undefined || payment) && (
                <dl className="admin-order__amounts">
                  {quote?.fee !== undefined && (
                    <div>
                      <dt>Tổng phí thuê</dt>
                      <dd>{rentalMoney(quote.fee)}</dd>
                    </div>
                  )}
                  {quote?.depositKind !== 'advance' && !!quote?.deposit && (
                    <div>
                      <dt>Cọc bảo đảm theo đơn</dt>
                      <dd>{rentalMoney(quote.deposit)}</dd>
                    </div>
                  )}
                  {payment && (
                    <>
                      <div>
                        <dt>
                          {depositIsOnlyPayment
                            ? quote?.depositKind === 'advance' && quote.depositPercent
                              ? `Đã cọc (${quote.depositPercent}%)`
                              : 'Đã cọc'
                            : rentalReceivedLabel(order.payments)}
                        </dt>
                        <dd>{rentalMoney(payment.netReceived)}</dd>
                      </div>
                      <div>
                        <dt>{payment.refundDue ? 'Cần hoàn' : 'Còn thu'}</dt>
                        <dd className="flex flex-col items-end gap-2">
                          {rentalMoney(payment.refundDue || payment.due)}
                          {balanceLinkAction}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              )}
              <section className="admin-order__recent">
                <h2>
                  <History size={19} aria-hidden="true" /> Hoạt động gần đây
                </h2>
                {latest.length ? (
                  <ol>
                    {latest.map((event, index) => (
                      <li key={`${event.action}-${event.at}-${index}`}>
                        <time dateTime={event.at}>{formatEventTime(event.at)}</time>
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

function formatEventTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? eventTime.format(timestamp) : '—';
}

function getTask(order: RentalOrder, stage: RentalStage): Task {
  const due = order.payment?.due ?? 0;
  if (order.payment?.refundDue) {
    return {
      title: 'Khoản tiền cần hoàn',
      text: `Cần hoàn ${rentalMoney(order.payment.refundDue)}. Ghi nhận sau khi đã hoàn tiền thực tế.`,
      tab: 'payments',
      label: 'Xem thanh toán',
    };
  }
  if (stage === 'cancelled' || stage === 'completed') {
    return {
      title: stage === 'completed' ? 'Đơn đã hoàn tất' : rentalLabels[order.status],
      text: 'Xem lại các cập nhật của đơn thuê.',
      tab: 'history',
      label: 'Xem lịch sử',
    };
  }
  if (order.reservationIssue || order.status === 'payment_review') {
    return {
      title: 'Kiểm tra ngoại lệ',
      text: order.reservationIssue || 'Kiểm tra khoản tiền đã nhận và tình trạng giữ hàng.',
      tab: 'handover',
      label: 'Xem giao & nhận trả',
    };
  }
  if (order.change && ['requested', 'proposed'].includes(order.change.status)) {
    return {
      title: 'Yêu cầu thay đổi',
      text: 'Kiểm tra yêu cầu gia hạn hoặc hủy trong hồ sơ.',
      tab: 'handover',
      label: 'Xem yêu cầu',
    };
  }
  if (stage === 'ready_for_pickup') {
    if (due > 0) {
      return {
        title: 'Cần thu tiền trước khi giao',
        text: `Cần thu ${rentalMoney(due)} trước khi giao đồ.`,
        tab: 'payments',
        label: 'Xem thanh toán',
      };
    }
    return {
      title: 'Chuẩn bị giao đồ',
      text: order.readyForHandover
        ? 'Đã đủ tiền. Giao trang phục trong kỳ thuê đã chốt.'
        : 'Kiểm tra điều kiện giao đồ trong hồ sơ.',
      tab: 'handover',
      label: 'Xem giao đồ',
    };
  }
  if (stage === 'renting' || stage === 'settling') {
    if (stage === 'settling' && order.settlement?.acceptedAt && due > 0) {
      return {
        title: 'Cần thu sau đối soát',
        text: `Khách đã đồng ý đối soát. Còn thu ${rentalMoney(due)}.`,
        tab: 'payments',
        label: 'Xem thanh toán',
      };
    }
    return stage === 'renting'
      ? {
          title: 'Kiểm tra và nhận trả',
          text: 'Đối chiếu số lượng đã giao và tình trạng từng món khi khách trả.',
          tab: 'handover',
          label: 'Mở nhận trả',
        }
      : {
          title: 'Đối soát sau nhận trả',
          text: 'Kiểm tra kết quả nhận trả và các khoản phát sinh trong đơn.',
          tab: 'handover',
          label: 'Xem đối soát',
        };
  }
  if (order.status === 'awaiting_deposit') {
    const deadline = order.depositPayment?.expiresAt ?? order.reservation?.expiresAt;
    return {
      title: 'Chờ thanh toán cọc',
      text:
        deadline && Number.isFinite(Date.parse(deadline))
          ? `Hạn thanh toán cọc ${formatEventTime(deadline)}.`
          : 'Kiểm tra khoản cọc và thời hạn giữ đồ của đơn.',
      tab: 'payments',
      label: 'Xem thanh toán',
    };
  }
  if (order.status === 'ready_to_confirm') {
    return {
      title: 'Xác nhận giữ hàng',
      text: 'Kiểm tra khả dụng theo mẫu, size và toàn bộ kỳ thuê.',
      tab: 'handover',
      label: 'Xem giữ hàng',
    };
  }
  return {
    title: 'Kiểm tra yêu cầu thuê',
    text: 'Xem danh sách trang phục, kỳ thuê và báo giá.',
    tab: 'items',
    label: 'Xem trang phục',
  };
}
