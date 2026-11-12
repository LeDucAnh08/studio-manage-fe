import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, DataTable, PageHeader, type Column } from '@/components/ui';
import {
  bookingWorkflowService,
  bookingOrderStageLabels,
  bookingOrderStatusLabel,
  type BookingOrderStage,
  type WorkflowSummary,
} from '../services/bookingWorkflowService';
import { useAuth } from '../context/AuthContext';
import { useCurrentTime } from '../components/customer/useCurrentTime';
import { useShootWindowRefresh } from '../components/customer/useShootWindowRefresh';
import { PhotographerUnavailability } from '../components/PhotographerUnavailability';
import { BookingNotifications } from './BookingsPage';

const money = (amount: number) => amount.toLocaleString('vi-VN') + ' đ';
const progressLabels: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  shooting: 'Đang chụp',
  editing: 'Đang hậu kỳ',
  delivered: 'Đã bàn giao',
};
const date = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Không tải được danh sách đơn chụp ảnh. Vui lòng thử lại.';

export default function BookingWorkflowListPage() {
  const now = useCurrentTime();
  const { user } = useAuth();
  const [items, setItems] = useState<WorkflowSummary[]>([]);
  const [params, setParams] = useSearchParams();
  const requestedStage = params.get('view') || '';
  const filter: BookingOrderStage | '' = Object.keys(bookingOrderStageLabels).includes(
    requestedStage,
  )
    ? (requestedStage as BookingOrderStage)
    : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const updatePage = (next: number) =>
    setParams((previous) => {
      const updated = new URLSearchParams(previous);
      updated.set('page', String(next));
      return updated;
    });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useShootWindowRefresh(items, setReloadKey);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    bookingWorkflowService
      .list(page, 20, filter)
      .then((response) => {
        if (active) {
          setItems(response.data);
          setTotal(response.pagination.total);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorText(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, filter, reloadKey]);

  const isAccountant = !!user?.roles.includes(5);
  const isPhotographer = !!user?.roles.includes(3);
  const isAdmin = !!user?.roles.some((role) => role === 0 || role === 1);

  const recordLink = (item: WorkflowSummary) => (
    <Link
      className="font-medium text-primary hover:underline"
      to={'/workflow-bookings/' + item.bookingId}
      state={{
        bookingOrdersReturnTo:
          '/workflow-bookings' + (params.toString() ? '?' + params.toString() : ''),
      }}
    >
      {item.className || item.packageName}
    </Link>
  );
  const columns: Column<WorkflowSummary>[] = [
    {
      key: 'booking',
      header: 'Đơn chụp',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          {recordLink(item)}
          <p className="mt-1 text-xs text-muted-foreground">#{item.bookingId.slice(-6)}</p>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Gói dịch vụ',
      className: 'min-w-[160px]',
      render: (item) => item.packageName,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'min-w-[150px]',
      render: (item) => (
        <Badge
          variant={
            ['cancelled', 'rejected'].includes(item.bookingStatus)
              ? 'destructive'
              : item.bookingStatus === 'pending'
                ? 'warning'
                : 'secondary'
          }
        >
          {bookingOrderStatusLabel(
            item.bookingStatus,
            item.lifecycle,
            item.orderStage,
            item.shootWindow,
            now,
          )}
        </Badge>
      ),
    },
    {
      key: 'photographer',
      header: 'Ekip',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          <p>{item.assignedPhotographer?.name || 'Chưa phân công'}</p>
          {!!item.assignedSupportPhotographers?.length && (
            <p className="mt-1 text-xs text-muted-foreground">
              Hỗ trợ: {item.assignedSupportPhotographers.map((row) => row.name).join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Ngày chụp',
      className: 'whitespace-nowrap',
      render: (item) =>
        item.shootDate
          ? date(item.shootDate) + (item.startTime ? ' · ' + item.startTime : '')
          : 'Chưa chốt lịch',
    },
    ...(isAccountant
      ? [
          {
            key: 'payment',
            header: 'Thanh toán',
            align: 'right' as const,
            className: 'min-w-[160px]',
            render: (item: WorkflowSummary) =>
              item.payment ? (
                <div>
                  <p>Đã nhận {money(item.payment.netReceived)}</p>
                  <p>Còn thu {money(item.payment.totalDue)}</p>
                  {!!item.payment.refundDue && (
                    <p className="text-destructive">Cần hoàn {money(item.payment.refundDue)}</p>
                  )}
                </div>
              ) : (
                '—'
              ),
          },
        ]
      : []),
    ...(isPhotographer
      ? [
          {
            key: 'progress',
            header: 'Tiến độ',
            render: (item: WorkflowSummary) =>
              item.progressStatus
                ? (progressLabels[item.progressStatus] ?? item.progressStatus)
                : 'Chưa bắt đầu',
          },
        ]
      : []),
    {
      key: 'updated',
      header: 'Cập nhật',
      className: 'whitespace-nowrap',
      render: (item) => date(item.updatedAt),
    },
  ];
  return (
    <section className="space-y-6 min-w-0">
      <PageHeader
        as="h1"
        title="Đơn chụp ảnh"
        description={
          isAccountant
            ? 'Theo dõi các khoản thu, cọc và số dư của hồ sơ dịch vụ.'
            : isPhotographer
              ? 'Chăm sóc đơn được giao, theo dõi lịch và tiến độ bàn giao.'
              : 'Xử lý yêu cầu, phân công ekip và theo dõi lịch chụp, thanh toán, bàn giao.'
        }
        action={
          <Button
            variant="outline"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            Tải lại
          </Button>
        }
      />
      {isAdmin && <BookingNotifications base="/workflow-bookings" />}
      {(isAdmin || isPhotographer) && user && (
        <PhotographerUnavailability userId={user._id} admin={isAdmin} />
      )}
      <div className="staff-toolbar rounded-lg border bg-card p-4">
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
          Trạng thái đơn
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={filter}
            onChange={(event) =>
              setParams((previous) => {
                const updated = new URLSearchParams(previous);
                if (event.target.value) updated.set('view', event.target.value);
                else updated.delete('view');
                updated.delete('page');
                return updated;
              })
            }
          >
            <option value="">Tất cả</option>
            {Object.entries(bookingOrderStageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <section className="rounded-lg border border-destructive/30 p-4" role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </Button>
        </section>
      ) : (
        <DataTable
          aria-label="Đơn chụp ảnh"
          columns={columns}
          data={items}
          keyExtractor={(item) => item.bookingId}
          loading={loading}
          emptyTitle="Chưa có đơn chụp ảnh phù hợp"
          emptyDescription={
            isAdmin || isAccountant
              ? 'Bạn có thể đổi bộ lọc trạng thái để xem các đơn khác.'
              : 'Đơn được phân công cho bạn sẽ xuất hiện tại đây.'
          }
          pagination={{
            serverSide: true,
            page,
            pageSize: 20,
            total,
            onPageChange: updatePage,
            hidePageSize: true,
          }}
        />
      )}
    </section>
  );
}
