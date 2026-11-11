import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { CustomerButton } from './CustomerButton';
import { BookingOrderProgress } from './BookingOrderProgress';
import { CustomerOrdersWorkspace } from './CustomerOrdersWorkspace';
import { vietnamDisplayDate as day } from '../../utils/vietnamCalendarDate';
import {
  bookingOrderStageLabels,
  bookingOrderStatusLabel,
  bookingWorkflowService,
  type BookingWorkflowDto,
  type BookingOrderStage,
  type WorkflowSummary,
} from '@/services/bookingWorkflowService';

const timeZone = 'Asia/Ho_Chi_Minh';
const time = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Chưa tải được thông tin. Vui lòng thử lại.';
const statusLabel = (order: WorkflowSummary) =>
  bookingOrderStatusLabel(order.bookingStatus, order.lifecycle, order.orderStage);

function OrderPreview({ order, reload }: { order: WorkflowSummary; reload: number }) {
  const location = useLocation();
  const [result, setResult] = useState<{ id: string; record?: BookingWorkflowDto; error?: string }>(
    { id: '' },
  );
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setResult({ id: order.bookingId });
    bookingWorkflowService
      .get(order.bookingId)
      .then((record) => {
        if (active) setResult({ id: order.bookingId, record });
      })
      .catch((error: unknown) => {
        if (active) setResult({ id: order.bookingId, error: errorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [order.bookingId, retry, reload]);
  const current = result.id === order.bookingId ? result : undefined;
  const record = current?.record;
  const booking = record?.booking;
  const workflow = record?.workflow;
  const schedule = workflow?.resources?.scheduleDetails || workflow?.quote?.proposedSchedule;
  const scheduled = !!workflow?.resources?.scheduleDetails;
  const label =
    booking && workflow
      ? bookingOrderStatusLabel(booking.status, workflow.lifecycle, workflow.orderStage)
      : statusLabel(order);
  const summary = [booking?.school || order.school, booking && `${booking.members} thành viên`]
    .filter(Boolean)
    .join(' · ');
  const stateMessage =
    booking?.status === 'cancelled'
      ? booking.cancellationReason || 'Yêu cầu đã được hủy.'
      : booking?.status === 'rejected'
        ? booking.reviewNote ||
          'Studio chưa thể tiếp nhận yêu cầu này. Bạn có thể xem phản hồi trong hồ sơ.'
        : workflow?.lifecycle === 'cancelled'
          ? 'Dịch vụ đã hủy. Mở hồ sơ để xem nội dung đã thống nhất với studio.'
          : workflow?.lifecycle === 'completed'
            ? 'Dịch vụ đã hoàn tất. Bạn có thể mở hồ sơ để xem lại ảnh và thông tin bàn giao.'
            : workflow?.lifecycle === 'change_pending'
              ? 'Yêu cầu thay đổi đang được xử lý. Mở hồ sơ để xem phản hồi và đề xuất của studio.'
              : workflow?.quote && !workflow.quote.acceptedAt
                ? 'Báo giá đã sẵn sàng. Mở hồ sơ để xem và xác nhận với studio.'
                : workflow?.lifecycle === 'confirmed'
                  ? 'Lịch đã được xác nhận. Bạn có thể xem hồ sơ để kiểm tra chi tiết.'
                  : 'Mở hồ sơ để xem phản hồi và các bước tiếp theo với studio.';
  return (
    <section
      className="customer-orders-preview"
      aria-labelledby="selected-order-title"
      aria-busy={!record && !current?.error}
    >
      <header>
        <p className="customer-orders-workspace__muted">
          Đơn chụp ảnh
          {(booking?.className || order.className) &&
            ` · Lớp ${booking?.className || order.className}`}
        </p>
        <div className="customer-orders-preview__title">
          <h2 id="selected-order-title">{booking?.packageName || order.packageName}</h2>
          <span
            className={`customer-orders-state ${order.lifecycle === 'completed' ? 'is-neutral' : ''}`}
          >
            {label}
          </span>
        </div>
        {summary && <p className="customer-orders-workspace__muted">{summary}</p>}
      </header>
      {current?.error ? (
        <div role="alert" className="customer-orders-workspace__state">
          <p>{current.error}</p>
          <CustomerButton variant="secondary" onClick={() => setRetry((value) => value + 1)}>
            Thử tải lại tiến độ
          </CustomerButton>
        </div>
      ) : !record ? (
        <p role="status" className="customer-orders-workspace__state">
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Đang tải tiến độ
          đơn…
        </p>
      ) : (
        <>
          <dl className="customer-orders-preview__schedule">
            <div>
              <dt>{scheduled ? 'Thời gian chụp' : 'Thời gian dự kiến'}</dt>
              <dd>
                {day(schedule?.shootDate || record.booking.startAt)} ·{' '}
                {schedule?.startTime || time(record.booking.startAt)} –{' '}
                {schedule?.endTime || time(record.booking.endAt)}
              </dd>
            </div>
            <div>
              <dt>Địa điểm{scheduled ? '' : ' dự kiến'}</dt>
              <dd>
                {schedule?.location || record.booking.location || 'Studio sẽ trao đổi với lớp'}
              </dd>
            </div>
          </dl>
          <BookingOrderProgress record={record} />
        </>
      )}
      <footer className="customer-orders-preview__footer">
        <p>{stateMessage}</p>
        <CustomerButton asChild>
          <Link
            to={`/account/bookings/${order.bookingId}`}
            state={{ ordersReturnTo: `${location.pathname}${location.search}` }}
          >
            Xem hồ sơ đầy đủ <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </CustomerButton>
      </footer>
    </section>
  );
}

export function CustomerBookingOrders() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<WorkflowSummary[]>([]);
  const selectedId = params.get('order') || '';
  const requestedView = params.get('view') || '';
  const view: BookingOrderStage | '' = Object.keys(bookingOrderStageLabels).includes(requestedView)
    ? (requestedView as BookingOrderStage)
    : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100_000
      ? requestedPage
      : 1;
  const changeList = (nextView: BookingOrderStage | '', nextPage = 1) =>
    setParams(
      (current) => {
        if (nextView) current.set('view', nextView);
        else current.delete('view');
        if (nextPage > 1) current.set('page', String(nextPage));
        else current.delete('page');
        current.delete('order');
        return current;
      },
      { replace: true },
    );
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    bookingWorkflowService
      .list(page, 20, view)
      .then((result) => {
        if (active) {
          setItems(result.data);
          setTotal(result.pagination.total);
        }
      })
      .catch((failure: unknown) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, view, reload]);
  const selected = items.find((item) => item.bookingId === selectedId) || items[0];
  return (
    <CustomerOrdersWorkspace
      kind="chụp ảnh"
      statusOptions={bookingOrderStageLabels}
      loading={loading}
      error={error}
      total={total}
      page={page}
      view={view}
      emptyMessage="Bạn chưa có đơn chụp ảnh. Chọn Chụp kỉ yếu để bắt đầu."
      onViewChange={(value) => changeList(value as BookingOrderStage | '')}
      onPageChange={(value) => changeList(view, value)}
      onReload={() => setReload((value) => value + 1)}
      preview={selected ? <OrderPreview order={selected} reload={reload} /> : null}
    >
      {items.map((item) => (
        <li key={item.bookingId}>
          <button
            type="button"
            aria-pressed={selected?.bookingId === item.bookingId}
            aria-controls="selected-order-panel"
            onClick={() =>
              setParams(
                (current) => {
                  current.set('order', item.bookingId);
                  return current;
                },
                { replace: true },
              )
            }
          >
            <span className="customer-orders-list__item-heading">
              <span>{item.packageName}</span>
              <span
                className={`customer-orders-state ${item.lifecycle === 'completed' ? 'is-neutral' : ''}`}
              >
                {statusLabel(item)}
              </span>
            </span>
            <span className="customer-orders-workspace__muted">
              {[item.className && `Lớp ${item.className}`, item.school]
                .filter(Boolean)
                .join(' · ') || 'Yêu cầu chụp ảnh'}
            </span>
            <span className="customer-orders-workspace__muted">
              {day(item.shootDate)}
              {item.startTime && ` · ${item.startTime}`}
            </span>
          </button>
        </li>
      ))}
    </CustomerOrdersWorkspace>
  );
}
