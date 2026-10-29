import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import { bookingService, type BookingNotification } from '@/services/bookingService';
import { CustomerButton } from './CustomerButton';
import '../../styles/customer-orders-workspace.css';

export function CustomerOrderNotifications() {
  const [items, setItems] = useState<BookingNotification[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      bookingService
        .notifications()
        .then((data) => {
          if (active) {
            setItems(data);
            setError('');
          }
        })
        .catch(() => {
          if (active) setError('Chưa tải được thông báo. Hãy thử lại.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [reload]);
  const unread = items.filter((item) => item.unread).length;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="customer-orders-notifications__trigger"
          aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ''}`}
        >
          <Bell size={22} aria-hidden="true" />
          {unread > 0 && <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="customer-ui customer-tokens customer-orders-notifications"
          align="end"
          sideOffset={12}
          collisionPadding={16}
          aria-label="Thông báo của bạn"
        >
          <header>
            <h2>Thông báo</h2>
            <CustomerButton
              variant="text"
              disabled={!unread || busy}
              onClick={async () => {
                const latest = [...items].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
                if (!latest) return;
                setBusy(true);
                try {
                  await bookingService.read(latest.at);
                  setReload((value) => value + 1);
                } catch {
                  setError('Chưa đánh dấu được thông báo. Hãy thử lại.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Đang cập nhật…' : 'Đánh dấu đã đọc'}
            </CustomerButton>
          </header>
          {loading ? (
            <p role="status">Đang tải thông báo…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <CustomerButton variant="text" onClick={() => setReload((value) => value + 1)}>
                Thử lại
              </CustomerButton>
            </div>
          ) : !items.length ? (
            <p>Chưa có thông báo mới.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item._id}>
                  <Popover.Close asChild>
                    <Link
                      to={`/account/bookings/${item.bookingId}`}
                      className={item.unread ? 'is-unread' : ''}
                    >
                      <p>{item.message}</p>
                      <time dateTime={item.at}>
                        {new Date(item.at).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </time>
                    </Link>
                  </Popover.Close>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
