import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CustomerButton } from './CustomerButton';
import { CustomerPrice } from './CustomerPrice';
import { ConceptOrderProgress } from './ConceptOrderProgress';
import { CustomerOrdersWorkspace } from './CustomerOrdersWorkspace';
import { vietnamDisplayDate as day } from '../../utils/vietnamCalendarDate';
import {
  conceptError,
  conceptService,
  conceptOrderStageLabels,
  vnTime,
  type ConceptOrder,
  type ConceptOrderStage,
} from '../../services/conceptService';

function ConceptPreview({ order }: { order: ConceptOrder }) {
  const location = useLocation();
  const stage = order.orderStage!;
  const cancelled = stage === 'cancelled';
  const completed = stage === 'completed';
  return (
    <section className="customer-orders-preview" aria-labelledby="selected-order-title">
      <header>
        <p className="customer-orders-workspace__muted">
          Đơn chụp concept · {order.snapshot.conceptName}
        </p>
        <div className="customer-orders-preview__title">
          <h2 id="selected-order-title">{order.snapshot.name}</h2>
          <span className={`customer-orders-state ${completed || cancelled ? 'is-neutral' : ''}`}>
            {conceptOrderStageLabels[stage]}
          </span>
        </div>
        <p className="customer-orders-workspace__muted">
          {order.contactName} · {order.people} người
        </p>
      </header>
      <dl className="customer-orders-preview__schedule">
        <div>
          <dt>Thời gian chụp</dt>
          <dd>{vnTime(order.startAt)}</dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd>{order.snapshot.durationMinutes} phút</dd>
        </div>
      </dl>
      <p>
        <CustomerPrice amount={order.snapshot.price} label="Giá gói:" />
      </p>
      <p>
        <CustomerPrice amount={order.netReceived} label="Đã thanh toán:" />
      </p>
      {order.refundDue > 0 && (
        <p>
          <CustomerPrice amount={order.refundDue} label="Cần hoàn:" />
        </p>
      )}
      <ConceptOrderProgress order={order} />
      <footer className="customer-orders-preview__footer">
        <p>
          {cancelled
            ? order.status === 'expired'
              ? 'Đơn đã hết hạn thanh toán cọc. Bạn có thể đặt buổi chụp mới.'
              : 'Đơn chụp đã hủy. Mở hồ sơ để xem thông tin và các khoản hoàn tiền.'
            : completed
              ? 'Buổi chụp đã hoàn thành. Bạn có thể xem lại album và thông tin bàn giao.'
              : stage === 'handing_over'
                ? 'Ảnh đang được chuẩn bị và bàn giao. Mở hồ sơ để theo dõi album và phản hồi với studio.'
                : 'Studio đã nhận cọc và xác nhận lịch. Mở hồ sơ để xem chi tiết buổi chụp.'}
        </p>
        <CustomerButton asChild>
          <Link
            to={`/account/concept-orders/${order._id}`}
            state={{ ordersReturnTo: `${location.pathname}${location.search}` }}
          >
            Xem hồ sơ đầy đủ <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </CustomerButton>
      </footer>
    </section>
  );
}

export function CustomerConceptOrders() {
  const [params, setParams] = useSearchParams();
  const requestedView = params.get('view') || '';
  const view = Object.prototype.hasOwnProperty.call(conceptOrderStageLabels, requestedView)
    ? (requestedView as ConceptOrderStage)
    : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const [items, setItems] = useState<ConceptOrder[]>([]);
  const [pending, setPending] = useState<ConceptOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const selected = items.find((order) => order._id === params.get('order')) || items[0];
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
    Promise.all([
      conceptService.list('', page, view || 'all'),
      conceptService.list('awaiting_deposit', 1),
    ])
      .then(([orders, unpaid]) => {
        if (!active) return;
        setItems(orders.data);
        setTotal(orders.pagination.total);
        setPending(unpaid.data);
      })
      .catch((failure: unknown) => {
        if (active) setError(conceptError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, view, reload]);
  return (
    <>
      {!loading && !error && pending.length > 0 && (
        <section
          className="customer-order-notice customer-concept-payment"
          aria-label="Tiếp tục thanh toán concept"
        >
          <p>Bạn có {pending.length} buổi chụp chưa hoàn tất tiền cọc.</p>
          {pending.map((order) => (
            <div key={order._id}>
              <span>
                {order.snapshot.name} · {vnTime(order.startAt)}
              </span>
              <CustomerButton asChild variant="secondary">
                <Link to={`/account/concept-orders/${order._id}?payment=deposit`}>
                  Tiếp tục thanh toán <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </CustomerButton>
            </div>
          ))}
        </section>
      )}
      <CustomerOrdersWorkspace
        kind="chụp concept"
        statusOptions={conceptOrderStageLabels}
        loading={loading}
        error={error}
        total={total}
        page={page}
        view={view}
        emptyMessage="Bạn chưa có đơn chụp concept. Chọn Chụp concept để đặt buổi chụp mới."
        onViewChange={(value) => changeList(value)}
        onPageChange={(value) => changeList(view, value)}
        onReload={() => setReload((value) => value + 1)}
        preview={selected ? <ConceptPreview order={selected} /> : null}
      >
        {items.map((order) => (
          <li key={order._id}>
            <button
              type="button"
              aria-pressed={selected?._id === order._id}
              aria-controls="selected-order-panel"
              onClick={() =>
                setParams(
                  (current) => {
                    current.set('order', order._id);
                    return current;
                  },
                  { replace: true },
                )
              }
            >
              <span className="customer-orders-list__item-heading">
                <span>{order.snapshot.name}</span>
                <span
                  className={`customer-orders-state ${['completed', 'cancelled'].includes(order.orderStage!) ? 'is-neutral' : ''}`}
                >
                  {conceptOrderStageLabels[order.orderStage!]}
                </span>
              </span>
              <span className="customer-orders-workspace__muted">
                {order.snapshot.conceptName} · {order.people} người
              </span>
              <span className="customer-orders-workspace__muted">{day(order.startAt)}</span>
            </button>
          </li>
        ))}
      </CustomerOrdersWorkspace>
    </>
  );
}
