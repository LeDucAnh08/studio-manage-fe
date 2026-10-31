import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, DataTable, PageHeader, type Column } from '@/components/ui';
import {
  rentalService,
  rentalLabels,
  rentalMoney,
  rentalDate,
  rentalError,
  type RentalOrder,
} from '../services/rentalService';

export default function RentalListPage() {
  const [params, setParams] = useSearchParams();
  const views = ['', 'active', 'completed', 'cancelled', 'rejected'];
  const view = views.includes(params.get('view') || '') ? params.get('view') || '' : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const [rows, setRows] = useState<RentalOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    rentalService
      .list(page, view)
      .then((result) => {
        if (active) {
          setRows(result.data);
          setTotal(result.pagination.total);
        }
      })
      .catch((error) => {
        if (active) setError(rentalError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, view, retry]);
  const returnTo = '/rental-orders' + (params.toString() ? '?' + params.toString() : '');
  const columns: Column<RentalOrder>[] = [
    {
      key: 'customer',
      header: 'Khách thuê',
      className: 'min-w-[180px]',
      render: (order) => (
        <div>
          <Link
            className="font-medium text-primary hover:underline"
            to={'/rental-orders/' + order._id}
            state={{ rentalOrdersReturnTo: returnTo }}
          >
            {order.contactName}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">#{order._id.slice(-6)}</p>
          {order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Trang phục',
      className: 'min-w-[200px]',
      render: (order) => {
        const lines = order.quote?.lines ?? order.requestedLines;
        return (
          <div>
            {lines.map((line, index) => (
              <p key={index}>
                {line.name} · {line.size} · {line.quantity} món
              </p>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'min-w-[160px]',
      render: (order) => (
        <Badge
          variant={
            ['cancelled', 'rejected'].includes(order.status)
              ? 'destructive'
              : order.status === 'completed'
                ? 'success'
                : 'secondary'
          }
        >
          {rentalLabels[order.status] ?? order.status}
        </Badge>
      ),
    },
    {
      key: 'dates',
      header: 'Ngày nhận – trả',
      className: 'whitespace-nowrap',
      render: (order) => (
        <div>
          <p>{rentalDate(order.quote?.receiveDate ?? order.requestedReceiveDate)}</p>
          <p className="text-muted-foreground">
            {rentalDate(order.quote?.returnDate ?? order.requestedReturnDate)}
          </p>
        </div>
      ),
    },
    {
      key: 'received',
      header: 'Đã nhận',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (order) => (order.payment ? rentalMoney(order.payment.netReceived) : '—'),
    },
    {
      key: 'balance',
      header: 'Còn thu / cần hoàn',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (order) =>
        order.payment ? (
          order.payment.refundDue ? (
            <span className="text-destructive">
              Cần hoàn {rentalMoney(order.payment.refundDue)}
            </span>
          ) : (
            rentalMoney(order.payment.due)
          )
        ) : (
          '—'
        ),
    },
    {
      key: 'updated',
      header: 'Cập nhật',
      className: 'whitespace-nowrap',
      render: (order) => rentalDate(order.updatedAt),
    },
  ];
  return (
    <section className="space-y-6 min-w-0">
      <PageHeader
        as="h1"
        title="Quản lý đơn thuê"
        description="Theo dõi giữ hàng, giao nhận và đối soát tiền."
        action={
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setRetry((value) => value + 1)}
          >
            Tải lại
          </Button>
        }
      />
      <div className="staff-toolbar rounded-lg border bg-card p-4">
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
          Trạng thái đơn
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={view}
            onChange={(event) =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                if (event.target.value) next.set('view', event.target.value);
                else next.delete('view');
                next.delete('page');
                return next;
              })
            }
          >
            <option value="">Tất cả</option>
            <option value="active">Đang xử lý</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </label>
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 p-4">
          <p className="text-destructive">{error}</p>
          <Button className="mt-3" variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Thử tải lại
          </Button>
        </div>
      ) : (
        <DataTable
          aria-label="Đơn thuê trang phục"
          data={rows}
          columns={columns}
          keyExtractor={(order) => order._id}
          loading={loading}
          emptyTitle="Chưa có đơn thuê phù hợp"
          emptyDescription="Bạn có thể đổi bộ lọc trạng thái để xem các đơn khác."
          pagination={{
            serverSide: true,
            page,
            pageSize: 20,
            total,
            hidePageSize: true,
            onPageChange: (next) =>
              setParams((previous) => {
                const updated = new URLSearchParams(previous);
                updated.set('page', String(next));
                return updated;
              }),
          }}
        />
      )}
    </section>
  );
}
