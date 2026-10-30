import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, LoaderCircle, RefreshCw } from 'lucide-react';
import { CustomerButton } from './CustomerButton';
import { CustomerSelect } from './CustomerFields';
import {
  bookingWorkflowLabels,
  bookingWorkflowService,
  type BookingWorkflowDto,
  type CustomerOrderView,
  type WorkflowSummary,
} from '@/services/bookingWorkflowService';
import { bookingLabels } from '@/services/bookingService';

const timeZone = 'Asia/Ho_Chi_Minh';
const day = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('vi-VN', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Chưa xác định';
const time = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Chưa tải được thông tin. Vui lòng thử lại.';
const statusLabel = (order: Pick<WorkflowSummary, 'bookingStatus' | 'lifecycle'>) =>
  order.bookingStatus === 'cancelled'
    ? bookingLabels.cancelled
    : order.bookingStatus === 'rejected'
      ? bookingLabels.rejected
      : bookingWorkflowLabels[order.lifecycle];

function OrderProgress({ record }: { record: BookingWorkflowDto }) {
  const { workflow, booking } = record;
  const terminal =
    ['rejected', 'cancelled'].includes(booking.status) || workflow.lifecycle === 'cancelled';
  const confirmed = !!workflow.resources?.scheduleId;
  const accepted = !!workflow.quote?.acceptedAt;
  const completed = workflow.lifecycle === 'completed';
  const events = workflow.events;
  const sentAt =
    [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]?.at || workflow.createdAt;
  const confirmedAt = events
    .filter((event) => ['resources.confirm', 'resources.confirmed'].includes(event.action))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at;
  const completedAt = events
    .filter((event) =>
      ['workflow.completed', 'payment.record', 'delivery.accept'].includes(event.action),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at;
  const active = [
    'shooting',
    'editing',
    'delivered',
    'revision_requested',
    'accepted',
    'completed',
  ].includes(workflow.lifecycle)
    ? 3
    : confirmed || workflow.lifecycle === 'ready_to_confirm'
      ? 2
      : workflow.quote
        ? 1
        : 0;
  const stages = [
    {
      label: 'Đã gửi yêu cầu',
      at: sentAt,
      done: true,
      description: !workflow.quote ? 'Studio sẽ kiểm tra và phản hồi yêu cầu của lớp.' : '',
    },
    {
      label: accepted ? 'Đã thống nhất báo giá' : 'Báo giá & đặt cọc',
      at: workflow.quote?.acceptedAt,
      done: accepted,
      description: !accepted && workflow.quote ? 'Mở hồ sơ để xem báo giá và các điều khoản.' : '',
    },
    {
      label: confirmed ? 'Đã chốt lịch' : 'Xác nhận lịch chụp',
      at: confirmedAt,
      done: confirmed,
      description: confirmed
        ? 'Ekip và lịch chụp đã được studio xác nhận.'
        : 'Lịch được xác nhận sau khi thống nhất báo giá và tiền cọc.',
    },
    {
      label: completed ? 'Đã hoàn tất dịch vụ' : 'Chụp & bàn giao',
      at: completed ? completedAt : workflow.progress?.acceptedAt || workflow.progress?.deliveredAt,
      done: completed,
      description: completed
        ? 'Ảnh đã được nghiệm thu và các khoản tiền đã đối soát.'
        : active === 3
          ? bookingWorkflowLabels[workflow.lifecycle]
          : workflow.resources?.scheduleDetails?.shootDate
            ? `Sau buổi chụp ngày ${day(workflow.resources.scheduleDetails.shootDate)}`
            : 'Theo lịch chụp đã thống nhất với studio.',
    },
  ];
  return (
    <section className="customer-orders-progress" aria-labelledby="orders-progress-title">
      <h3 id="orders-progress-title">Tiến độ đơn</h3>
      <ol>
        {stages.map((stage, index) =>
          terminal && !stage.done ? null : (
            <li
              key={stage.label}
              className={`${!terminal && index === active ? 'is-current' : ''} ${stage.done ? 'is-complete' : ''}`}
              aria-current={!terminal && index === active ? 'step' : undefined}
            >
              <span className="customer-orders-progress__marker" aria-hidden="true">
                {stage.done && <Check size={16} />}
              </span>
              <div>
                <p className="customer-orders-progress__label">{stage.label}</p>
                {stage.at && <time dateTime={stage.at}>{day(stage.at)}</time>}
                {stage.description &&
                  !terminal &&
                  (index === active || index === 3 || completed) && <p>{stage.description}</p>}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}

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
    booking?.status === 'cancelled'
      ? bookingLabels.cancelled
      : booking?.status === 'rejected'
        ? bookingLabels.rejected
        : workflow
          ? bookingWorkflowLabels[workflow.lifecycle]
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
          <OrderProgress record={record} />
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
  const view: CustomerOrderView = ['active', 'completed', 'cancelled', 'rejected'].includes(
    requestedView,
  )
    ? (requestedView as CustomerOrderView)
    : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100_000
      ? requestedPage
      : 1;
  const changeList = (nextView: CustomerOrderView, nextPage = 1) =>
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
    <div className="customer-orders-workspace__columns">
      <section className="customer-orders-list" aria-labelledby="orders-list-title">
        <div className="customer-orders-list__toolbar">
          <h2 id="orders-list-title">{loading ? 'Đơn chụp ảnh' : `${total} đơn chụp ảnh`}</h2>
          <div>
            <label className="sr-only" htmlFor="order-view">
              Trạng thái
            </label>
            <CustomerSelect
              id="order-view"
              value={view}
              onChange={(event) => {
                changeList(event.target.value as CustomerOrderView);
              }}
            >
              <option value="">Tất cả</option>
              <option value="active">Đang thực hiện</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
              <option value="rejected">Đã từ chối</option>
            </CustomerSelect>
            <CustomerButton
              variant="text"
              aria-label="Tải lại đơn"
              title="Tải lại đơn"
              disabled={loading}
              onClick={() => setReload((value) => value + 1)}
            >
              <RefreshCw size={18} aria-hidden="true" />
            </CustomerButton>
          </div>
        </div>
        {loading ? (
          <p role="status" className="customer-orders-workspace__state">
            Đang tải danh sách đơn…
          </p>
        ) : error ? (
          <div role="alert" className="customer-orders-workspace__state">
            <p>{error}</p>
            <CustomerButton variant="secondary" onClick={() => setReload((value) => value + 1)}>
              Thử lại
            </CustomerButton>
          </div>
        ) : !items.length ? (
          <p className="customer-orders-workspace__state">
            {view
              ? 'Chưa có đơn phù hợp với trạng thái này.'
              : 'Bạn chưa có đơn chụp ảnh. Chọn Đặt dịch vụ để bắt đầu.'}
          </p>
        ) : (
          <ul className="customer-orders-list__items" aria-label="Danh sách đơn chụp ảnh">
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
          </ul>
        )}
        {!loading && !error && (total > 20 || page > 1) && (
          <nav className="customer-orders-list__pagination" aria-label="Trang đơn chụp ảnh">
            <CustomerButton
              variant="secondary"
              disabled={page === 1}
              onClick={() => {
                changeList(view, page - 1);
              }}
            >
              Trước
            </CustomerButton>
            <span>
              Trang {page} / {Math.max(page, Math.ceil(total / 20))}
            </span>
            <CustomerButton
              variant="secondary"
              disabled={page * 20 >= total}
              onClick={() => {
                changeList(view, page + 1);
              }}
            >
              Sau
            </CustomerButton>
          </nav>
        )}
      </section>
      <div
        id="selected-order-panel"
        className="customer-orders-workspace__detail"
        aria-live="polite"
      >
        {!loading && !error && selected && items.length > 0 ? (
          <OrderPreview order={selected} reload={reload} />
        ) : (
          <div className="customer-orders-workspace__placeholder">
            {loading
              ? 'Đang chuẩn bị hồ sơ…'
              : error
                ? 'Danh sách đơn chưa tải được.'
                : 'Tiến độ và thông tin đơn sẽ hiển thị tại đây.'}
          </div>
        )}
      </div>
    </div>
  );
}
