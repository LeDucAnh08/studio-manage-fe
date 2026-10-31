import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CustomerButton } from './CustomerButton';
import { CustomerPrice } from './CustomerPrice';
import { CustomerOrdersWorkspace, CustomerOrderProgress } from './CustomerOrdersWorkspace';
import { vietnamDisplayDate as day } from '../../utils/vietnamCalendarDate';
import {
  rentalService,
  rentalLabels,
  rentalError,
  type RentalOrder,
} from '../../services/rentalService';

const linesFor = (order: RentalOrder) => order.quote?.lines ?? order.requestedLines;
const titleFor = (order: RentalOrder) => {
  const lines = linesFor(order);
  return `${lines[0]?.name || 'Yêu cầu thuê trang phục'}${lines.length > 1 ? ` + ${lines.length - 1} mẫu` : ''}`;
};

function RentalPreview({ order }: { order: RentalOrder }) {
  const location = useLocation();
  const lines = linesFor(order);
  const terminal = ['cancelled', 'rejected'].includes(order.status);
  const completed = order.status === 'completed';
  const held =
    ['confirmed', 'checked_out', 'returned', 'completed'].includes(order.status) ||
    order.events.some((event) => event.action === 'resources.confirm');
  const accepted = !!order.quote?.acceptedAt;
  const eventAt = (...actions: string[]) =>
    order.events
      .filter((event) => actions.includes(event.action))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at;
  const active = ['checked_out', 'returned', 'completed'].includes(order.status)
    ? 3
    : held || order.status === 'ready_to_confirm'
      ? 2
      : order.quote || order.status === 'quoting'
        ? 1
        : 0;
  const message =
    order.reservationIssue ||
    (terminal
      ? 'Yêu cầu đã kết thúc. Mở hồ sơ để xem phản hồi và các khoản tiền liên quan.'
      : completed
        ? 'Đơn thuê đã hoàn tất. Bạn có thể mở hồ sơ để xem lại thông tin giao nhận và thanh toán.'
        : order.change && ['requested', 'proposed'].includes(order.change.status)
          ? 'Đơn có yêu cầu thay đổi. Mở hồ sơ để xem phản hồi và xác nhận với studio.'
          : order.quote && !accepted
            ? 'Báo giá đã sẵn sàng. Mở hồ sơ để xem và xác nhận với studio.'
            : 'Mở hồ sơ để xem thông tin giữ hàng, giao nhận và các bước tiếp theo với studio.');
  const stages = [
    {
      label: 'Đã gửi yêu cầu',
      at: order.createdAt,
      done: true,
      description: 'Studio sẽ kiểm tra và phản hồi yêu cầu thuê.',
    },
    {
      label: accepted ? 'Đã thống nhất báo giá' : 'Báo giá & đặt cọc',
      at: order.quote?.acceptedAt,
      done: accepted,
      description: 'Mở hồ sơ để xem báo giá và điều kiện thuê.',
    },
    {
      label: held ? 'Đã giữ trang phục' : 'Xác nhận giữ trang phục',
      at: eventAt('resources.confirm'),
      done: held,
      description: 'Studio giữ hàng sau khi thống nhất báo giá và ghi nhận đủ cọc bảo đảm.',
    },
    {
      label: completed ? 'Đã hoàn tất dịch vụ' : 'Nhận, trả & hoàn tất',
      at: completed
        ? eventAt('completed', 'settlement.accept', 'payment.record')
        : order.returnedAt || order.checkedOutAt,
      done: completed,
      description:
        active === 3
          ? rentalLabels[order.status]
          : 'Nhận và trả theo kỳ thuê đã thống nhất với studio.',
    },
  ];
  return (
    <section className="customer-orders-preview" aria-labelledby="selected-order-title">
      <header>
        <p className="customer-orders-workspace__muted">Đơn thuê trang phục</p>
        <div className="customer-orders-preview__title">
          <h2 id="selected-order-title">{titleFor(order)}</h2>
          <span className={`customer-orders-state ${completed || terminal ? 'is-neutral' : ''}`}>
            {rentalLabels[order.status] || order.status}
          </span>
        </div>
        <p className="customer-orders-workspace__muted">
          {order.contactName} · {lines.reduce((sum, line) => sum + line.quantity, 0)} món
        </p>
      </header>
      <dl className="customer-orders-preview__schedule">
        <div>
          <dt>Ngày nhận{order.quote ? '' : ' dự kiến'}</dt>
          <dd>{day(order.quote?.receiveDate || order.requestedReceiveDate)}</dd>
        </div>
        <div>
          <dt>Ngày trả{order.quote ? '' : ' dự kiến'}</dt>
          <dd>{day(order.quote?.returnDate || order.requestedReturnDate)}</dd>
        </div>
      </dl>
      {order.quote?.fee !== undefined && (
        <p>
          <CustomerPrice amount={order.quote.fee} label="Tiền thuê:" />
        </p>
      )}
      {order.payment && (
        <p>
          <CustomerPrice
            amount={order.payment.refundDue || order.payment.due}
            label={order.payment.refundDue ? 'Cần hoàn:' : 'Còn thanh toán:'}
          />
        </p>
      )}
      <CustomerOrderProgress stages={stages} currentStep={active} terminal={terminal} />
      <footer className="customer-orders-preview__footer">
        <p>{message}</p>
        <CustomerButton asChild>
          <Link
            to={`/account/rentals/${order._id}`}
            state={{ ordersReturnTo: `${location.pathname}${location.search}` }}
          >
            Xem hồ sơ đầy đủ <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </CustomerButton>
      </footer>
    </section>
  );
}

export function CustomerRentalOrders() {
  const [params, setParams] = useSearchParams();
  const requestedView = params.get('view') || '';
  const view = ['active', 'completed', 'cancelled', 'rejected'].includes(requestedView)
    ? requestedView
    : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const [items, setItems] = useState<RentalOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const selected = items.find((item) => item._id === params.get('order')) || items[0];
  const changeList = (nextView: string, nextPage = 1) =>
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
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    rentalService
      .list(page, view)
      .then((result) => {
        if (active) {
          setItems(result.data);
          setTotal(result.pagination.total);
        }
      })
      .catch((failure: unknown) => {
        if (active) setError(rentalError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, view, reload]);
  return (
    <CustomerOrdersWorkspace
      kind="thuê trang phục"
      loading={loading}
      error={error}
      total={total}
      page={page}
      view={view}
      emptyMessage="Chưa có đơn thuê"
      onViewChange={(value) => changeList(value)}
      onPageChange={(value) => changeList(view, value)}
      onReload={() => setReload((value) => value + 1)}
      preview={selected ? <RentalPreview order={selected} /> : null}
    >
      {items.map((item) => (
        <li key={item._id}>
          <button
            type="button"
            aria-pressed={selected?._id === item._id}
            aria-controls="selected-order-panel"
            onClick={() =>
              setParams(
                (current) => {
                  current.set('order', item._id);
                  return current;
                },
                { replace: true },
              )
            }
          >
            <span className="customer-orders-list__item-heading">
              <span>{titleFor(item)}</span>
              <span
                className={`customer-orders-state ${['completed', 'cancelled', 'rejected'].includes(item.status) ? 'is-neutral' : ''}`}
              >
                {rentalLabels[item.status] || item.status}
              </span>
            </span>
            <span className="customer-orders-workspace__muted">
              {item.contactName} · {linesFor(item).reduce((sum, line) => sum + line.quantity, 0)}{' '}
              món
            </span>
            <span className="customer-orders-workspace__muted">
              {day(item.quote?.receiveDate || item.requestedReceiveDate)} –{' '}
              {day(item.quote?.returnDate || item.requestedReturnDate)}
            </span>
          </button>
        </li>
      ))}
    </CustomerOrdersWorkspace>
  );
}
