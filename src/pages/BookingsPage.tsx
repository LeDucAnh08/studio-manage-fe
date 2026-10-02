import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Textarea } from '@/components/ui';
import {
  bookingService,
  bookingLabels,
  type Booking,
  type BookingNotification,
} from '../services/bookingService';

const date = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const money = (value: number) => value.toLocaleString('vi-VN') + ' đ';
const errorText = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Không thể tải hoặc lưu dữ liệu. Vui lòng thử lại.';
const selectClass = 'h-10 rounded-md border bg-background px-3 text-sm w-full';

export function BookingNotifications({ base }: { base: string }) {
  const [items, setItems] = useState<BookingNotification[]>([]);
  const [error, setError] = useState('');
  const reload = useCallback(
    () =>
      bookingService
        .notifications()
        .then((data) => {
          setItems(data);
          setError('');
        })
        .catch((e) => setError(errorText(e))),
    [],
  );
  useEffect(() => {
    void reload();
    const timer = window.setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);
  return (
    <section className="border rounded-xl p-4 bg-card space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="font-semibold">
          Thông báo {items.some((i) => i.unread) && `(${items.filter((i) => i.unread).length} mới)`}
        </h2>
        <Button
          size="sm"
          variant="outline"
          disabled={!items.some((item) => item.unread)}
          onClick={async () => {
            try {
              if (items[0]) await bookingService.read(items[0].at);
              await reload();
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          Đánh dấu đã đọc
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!items.length && !error && (
        <p className="text-sm text-muted-foreground">Chưa có thông báo.</p>
      )}
      <div className="max-h-60 overflow-auto space-y-2">
        {items.map((i) => (
          <Link
            key={i._id}
            to={`${base}/${i.bookingId}`}
            className={`block rounded-lg p-3 text-sm ${i.unread ? 'bg-primary/10' : 'bg-muted/30'}`}
          >
            <p>{i.message}</p>
            <time className="text-xs text-muted-foreground">{date(i.at)}</time>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function BookingsPage({ admin = false }: { admin?: boolean }) {
  const [items, setItems] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const base = admin ? '/booking-requests' : '/account/bookings';
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    bookingService
      .list(page, status)
      .then((r) => {
        if (active) {
          setItems(r.data);
          setTotal(r.pagination.total);
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, status, refresh]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {admin ? 'Yêu cầu đặt dịch vụ' : 'Booking của tôi'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {admin
              ? 'Kiểm tra yêu cầu và phản hồi cho khách hàng.'
              : 'Theo dõi yêu cầu và phản hồi từ Yume Studio.'}
          </p>
        </div>
        {!admin && (
          <Link
            to="/account/bookings/new"
            className="rounded-lg bg-primary text-primary-foreground px-4 py-3 self-start"
          >
            Đặt dịch vụ
          </Link>
        )}
      </div>
      <BookingNotifications base={base} />
      <div className="flex flex-wrap gap-3 items-center">
        <label htmlFor="status">Trạng thái</label>
        <select
          id="status"
          className={`${selectClass} max-w-xs`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {Object.entries(bookingLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
          Tải lại
        </Button>
      </div>
      {loading ? (
        <p>Đang tải…</p>
      ) : error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : !items.length ? (
        <p className="border rounded-xl p-8 text-center text-muted-foreground">
          Chưa có yêu cầu phù hợp.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item._id}
              to={`${base}/${item._id}`}
              className="border bg-card rounded-xl p-5 hover:border-primary transition space-y-2"
            >
              <span className="text-xs rounded-full bg-muted px-3 py-1">
                {bookingLabels[item.status]}
              </span>
              <h2 className="font-semibold text-lg">{item.packageName}</h2>
              {admin && (
                <p>
                  {item.contactName} · {item.phone}
                </p>
              )}
              <p className="text-sm">
                {date(item.startAt)} — {date(item.endAt)}
              </p>
              <p className="text-sm text-muted-foreground break-words">{item.location}</p>
              <p className="text-primary text-sm">Xem chi tiết →</p>
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          disabled={page === 1 || loading}
          onClick={() => setPage((v) => v - 1)}
        >
          Trước
        </Button>
        <span>
          Trang {page} · {total} yêu cầu
        </span>
        <Button
          variant="outline"
          disabled={page * 20 >= total || loading}
          onClick={() => setPage((v) => v + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

export function BookingDetailPage({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const [item, setItem] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setItem(null);
    setError('');
    bookingService
      .get(id!)
      .then((v) => {
        if (active) setItem(v);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  const review = async (status: 'approved' | 'rejected') => {
    setBusy(true);
    setError('');
    try {
      await bookingService.review(id!, status, note);
      setItem(await bookingService.get(id!));
      toast.success('Đã gửi phản hồi cho khách');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <Link className="text-primary" to={admin ? '/booking-requests' : '/account/bookings'}>
        ← Danh sách yêu cầu
      </Link>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!item ? (
        !error && <p>Đang tải…</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">{item.packageName}</h1>
          <p>{bookingLabels[item.status]}</p>
          <div className="border rounded-xl bg-card p-5 space-y-3">
            <p>
              <strong>Thời gian mong muốn:</strong> {date(item.startAt)} — {date(item.endAt)}
            </p>
            <p>
              <strong>Địa điểm:</strong> {item.location}
            </p>
            <p>
              <strong>Liên hệ:</strong> {item.contactName} · {item.phone}
            </p>
            <p>
              <strong>Số người:</strong> {item.members}
            </p>
            <p>
              <strong>Giá tham khảo lúc gửi:</strong> {money(item.pricePerMember)} / người · Tổng{' '}
              {money(item.pricePerMember * item.members)}
            </p>
            <p className="text-sm text-muted-foreground">
              Giá cuối cùng và lịch chính thức sẽ được studio liên hệ xác nhận. Yêu cầu này chưa giữ
              chỗ và chưa thu tiền.
            </p>
            {item.note && <p className="whitespace-pre-wrap break-words">Ghi chú: {item.note}</p>}
          </div>
          {item.reviewNote && (
            <section className="border rounded-xl p-5">
              <h2 className="font-semibold">Phản hồi của studio</h2>
              <p className="whitespace-pre-wrap mt-2">{item.reviewNote}</p>
            </section>
          )}
          {admin && item.status === 'pending' && (
            <section className="border rounded-xl p-5 space-y-3">
              <h2 className="font-semibold">Xét duyệt yêu cầu</h2>
              <p className="text-sm text-muted-foreground">
                Kiểm tra khả năng phục vụ trước khi duyệt. Thao tác này chưa phân công nhân viên
                hoặc giữ tài nguyên.
              </p>
              <label htmlFor="review-note" className="block">
                Nội dung phản hồi cho khách
              </label>
              <Textarea
                id="review-note"
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-3">
                <Button disabled={busy || !note.trim()} onClick={() => review('approved')}>
                  Duyệt yêu cầu
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !note.trim()}
                  onClick={() => review('rejected')}
                >
                  Từ chối
                </Button>
              </div>
            </section>
          )}
          <section className="space-y-3">
            <h2 className="font-semibold">Lịch sử xử lý</h2>
            {(item.events ?? []).map((e, index) => (
              <div key={e._id ?? `${e.at}-${index}`} className="border-l-2 pl-4 py-2">
                <time className="text-xs text-muted-foreground">{date(e.at)}</time>
                <p className="text-sm mt-1">{e.message}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

export { default as NewBookingPage } from './BookingWizardPage';
