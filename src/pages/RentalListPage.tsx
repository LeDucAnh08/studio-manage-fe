import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderButton as Button } from '../components/customer/CustomerOrderControls';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import { CustomerOrderCard } from '../components/customer/CustomerOrderCard';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import { CustomerStatusBadge } from '../components/customer/CustomerStatusBadge';
import '../styles/customer-orders.css';
import { useAuth } from '../context/AuthContext';
import {
  rentalService,
  rentalLabels,
  rentalMoney,
  rentalDate,
  rentalError,
  type RentalOrder,
} from '../services/rentalService';
export default function RentalListPage() {
  const customer = useCustomerAppearance();
  const OrderCard = customer ? CustomerOrderCard : Link;
  const Status = customer ? CustomerStatusBadge : 'span';
  const { user } = useAuth();
  const client = !!user?.roles.includes(6);
  const [rows, setRows] = useState<RentalOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await rentalService.list(page);
      setRows(data.data);
      setTotal(data.pagination.total);
    } catch (e) {
      setError(rentalError(e));
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className={customer ? 'customer-orders' : 'space-y-6'}>
      <header
        className={
          customer ? 'customer-orders__header' : 'flex flex-wrap items-center justify-between gap-3'
        }
      >
        <div>
          <h1 className={customer ? 'customer-page-title' : 'text-2xl font-bold'}>
            {client ? 'Đơn thuê của tôi' : 'Quản lý đơn thuê'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Báo giá, giữ hàng, giao nhận và đối soát tiền.
          </p>
        </div>
        {client &&
          (customer ? (
            <Button asChild>
              <Link to="/rental/start">Yêu cầu thuê mới</Link>
            </Button>
          ) : (
            <Link
              to="/rental/start"
              className="rounded-lg bg-primary px-4 py-3 text-primary-foreground"
            >
              Yêu cầu thuê mới
            </Link>
          ))}
      </header>
      {loading ? (
        <p role="status">Đang tải đơn thuê…</p>
      ) : error ? (
        <div role="alert">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Thử tải lại
          </Button>
        </div>
      ) : rows.length ? (
        <div className={customer ? 'customer-order-grid' : 'grid gap-3'}>
          {rows.map((order) => (
            <OrderCard
              key={order._id}
              to={`${client ? '/account/rentals' : '/rental-orders'}/${order._id}`}
              className={
                customer
                  ? undefined
                  : 'rounded-xl border bg-card p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              }
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className={customer ? 'customer-order-title' : 'font-semibold'}>
                  {order.contactName} ·{' '}
                  {order.quote?.lines[0]?.name ?? order.requestedLines[0]?.name}
                </h2>
                <Status className={customer ? undefined : 'text-sm text-primary'}>
                  {rentalLabels[order.status]}
                </Status>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {rentalDate(order.quote?.receiveDate ?? order.requestedReceiveDate)} –{' '}
                {rentalDate(order.quote?.returnDate ?? order.requestedReturnDate)}
              </p>
              {order.payment && (
                <p className="mt-2 text-sm">
                  {customer ? (
                    <CustomerPrice
                      amount={order.payment.refundDue ? order.payment.refundDue : order.payment.due}
                      label={order.payment.refundDue ? 'Cần hoàn:' : 'Còn thu:'}
                    />
                  ) : order.payment.refundDue ? (
                    'Cần hoàn: ' + rentalMoney(order.payment.refundDue)
                  ) : (
                    'Còn thu: ' + rentalMoney(order.payment.due)
                  )}
                </p>
              )}
            </OrderCard>
          ))}
        </div>
      ) : (
        <section className={customer ? 'customer-order-surface' : 'rounded-xl border p-6'}>
          <h2 className={customer ? 'customer-order-title' : 'font-semibold'}>Chưa có đơn thuê</h2>
          <p className="mt-2 text-muted-foreground">
            Chọn trang phục/phụ kiện và gửi yêu cầu để studio tư vấn.
          </p>
        </section>
      )}
      {total > 20 && (
        <div className={customer ? 'customer-orders__pagination' : 'flex items-center gap-3'}>
          <Button
            variant="outline"
            disabled={page === 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Trang trước
          </Button>
          <span>Trang {page}</span>
          <Button
            variant="outline"
            disabled={page * 20 >= total || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </main>
  );
}
