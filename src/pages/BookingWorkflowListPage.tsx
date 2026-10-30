import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import {
  bookingWorkflowService,
  type BookingWorkflowLifecycle,
  type WorkflowSummary,
  type CustomerOrderView,
} from '../services/bookingWorkflowService';
import { useAuth } from '../context/AuthContext';
import { PhotographerUnavailability } from '../components/PhotographerUnavailability';
import { BookingNotifications } from './BookingsPage';

const lifecycleLabels: Record<BookingWorkflowLifecycle, string> = {
  intake: 'Mới tiếp nhận',
  quoting: 'Đang báo giá',
  awaiting_deposit: 'Chờ cọc',
  ready_to_confirm: 'Đủ điều kiện xác nhận',
  confirmed: 'Đã chốt lịch',
  shooting: 'Đang chụp',
  editing: 'Đang hậu kỳ',
  delivered: 'Đã bàn giao',
  revision_requested: 'Đang chỉnh sửa',
  accepted: 'Khách đã nghiệm thu',
  completed: 'Hoàn tất',
  change_pending: 'Chờ xác nhận thay đổi',
  cancelled: 'Đã hủy',
};

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
  const { user } = useAuth();
  const [items, setItems] = useState<WorkflowSummary[]>([]);
  const [params, setParams] = useSearchParams();
  const views = ['', 'pending', 'active', 'completed', 'cancelled', 'rejected'];
  const filter = views.includes(params.get('view') || '') ? params.get('view') || '' : '';
  const view: CustomerOrderView = filter === 'pending' ? '' : (filter as CustomerOrderView);
  const status = filter === 'pending' ? 'pending' : filter === 'active' ? 'approved' : '';
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    bookingWorkflowService
      .list(page, 20, view, status)
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
  }, [page, view, status, reloadKey]);

  const isAccountant = !!user?.roles.includes(5);
  const isPhotographer = !!user?.roles.includes(3);
  const isAdmin = !!user?.roles.some((role) => role === 0 || role === 1);

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đơn chụp ảnh</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAccountant
              ? 'Theo dõi các khoản thu, cọc và số dư của hồ sơ dịch vụ.'
              : isPhotographer
                ? 'Chăm sóc những đơn được giao, theo dõi lịch chụp và cập nhật tiến độ bàn giao.'
                : 'Xử lý yêu cầu mới, phân công ekip và theo dõi báo giá, lịch chụp, thanh toán, bàn giao.'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
        >
          Tải lại
        </Button>
      </header>

      {isAdmin && <BookingNotifications base="/workflow-bookings" />}

      {(isAdmin || isPhotographer) && user && (
        <PhotographerUnavailability userId={user._id} admin={isAdmin} />
      )}

      <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
        Trạng thái đơn
        <select
          className="min-h-11 rounded-lg border bg-background px-3"
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
          <option value="pending">Chờ duyệt</option>
          <option value="active">Đang xử lý</option>
          <option value="completed">Hoàn tất</option>
          <option value="cancelled">Đã hủy</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </label>

      {loading ? (
        <p role="status" className="rounded-xl border p-5 text-sm text-muted-foreground">
          Đang tải đơn chụp ảnh…
        </p>
      ) : error ? (
        <section className="rounded-xl border border-destructive/30 p-5" role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </Button>
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h2 className="font-semibold">Chưa có đơn chụp ảnh phù hợp</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin || isAccountant
              ? 'Các đơn gửi đến studio sẽ xuất hiện tại đây. Bạn có thể đổi bộ lọc trạng thái.'
              : 'Đơn được phân công cho bạn sẽ xuất hiện tại đây.'}
          </p>
        </section>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Link
              key={item.bookingId}
              to={'/workflow-bookings/' + item.bookingId}
              state={{
                bookingOrdersReturnTo:
                  '/workflow-bookings' + (params.toString() ? '?' + params.toString() : ''),
              }}
              className="grid gap-3 rounded-xl border bg-card p-4 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.className || item.packageName}</h2>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {item.bookingStatus === 'cancelled'
                      ? 'Đã hủy'
                      : item.bookingStatus === 'rejected'
                        ? 'Đã từ chối'
                        : item.bookingStatus === 'pending'
                          ? 'Chờ duyệt'
                          : lifecycleLabels[item.lifecycle]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.className ? item.packageName + ' · ' : ''}Gói dịch vụ
                </p>
                <p className="mt-1 text-sm">
                  Thợ phụ trách: {item.assignedPhotographer?.name || 'Chưa phân công'}
                </p>
                {!!item.assignedSupportPhotographers?.length && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thợ hỗ trợ:{' '}
                    {item.assignedSupportPhotographers.map((row) => row.name).join(', ')}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.shootDate ? 'Ngày chụp: ' + date(item.shootDate) : 'Chưa chốt ngày chụp'}
                  {' · '}Cập nhật {date(item.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                {isAccountant && item.payment && (
                  <span className="text-sm">
                    Đã nhận {money(item.payment.netReceived)} · Còn thu{' '}
                    {money(item.payment.totalDue)}
                    {item.payment.refundDue ? ` · Cần hoàn ${money(item.payment.refundDue)}` : ''}
                  </span>
                )}
                {isPhotographer && item.progressStatus && (
                  <span className="text-sm">
                    Tiến độ: {progressLabels[item.progressStatus] ?? item.progressStatus}
                  </span>
                )}
                <span className="text-sm font-semibold text-primary">Mở hồ sơ →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          disabled={page === 1 || loading}
          onClick={() => updatePage(page - 1)}
        >
          Trước
        </Button>
        <span className="text-sm">
          Trang {page} · {total} đơn
        </span>
        <Button
          variant="outline"
          disabled={page * 20 >= total || loading}
          onClick={() => updatePage(page + 1)}
        >
          Sau
        </Button>
      </div>
    </main>
  );
}
