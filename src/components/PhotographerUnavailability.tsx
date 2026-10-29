import { useEffect, useState } from 'react';
import { photographerService, type PhotographerBlock } from '../services/photographerService';
import { userService } from '../services/userService';
import type { User } from '../types';

const localInput = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};
const format = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  'Không tải hoặc lưu được lịch bận. Vui lòng thử lại.';
const inputClass = 'min-h-11 min-w-0 w-full rounded-lg border bg-background px-3';

export function PhotographerUnavailability({ userId, admin }: { userId: string; admin: boolean }) {
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [photographerId, setPhotographerId] = useState(admin ? '' : userId);
  const [rows, setRows] = useState<PhotographerBlock[]>([]);
  const [id, setId] = useState<string>();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [usersReload, setUsersReload] = useState(0);
  useEffect(() => {
    if (!admin) return;
    let active = true;
    userService
      .getPhotographers()
      .then((users) => {
        if (active) {
          setPhotographers(users);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [admin, usersReload]);
  useEffect(() => {
    let active = true;
    setRows([]);
    setId(undefined);
    setStart('');
    setEnd('');
    setNote('');
    if (!photographerId) return;
    setLoading(true);
    setError('');
    photographerService
      .blocks(photographerId)
      .then((items) => {
        if (active) setRows(items);
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
  }, [photographerId, reload]);
  const reset = () => {
    setId(undefined);
    setStart('');
    setEnd('');
    setNote('');
  };
  const mutate = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      reset();
      setReload((value) => value + 1);
      setNotice('Đã cập nhật lịch bận.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="rounded-2xl border bg-card p-5">
      <summary className="cursor-pointer py-2 font-semibold">
        {admin ? 'Quản lý lịch bận của thợ' : 'Lịch bận của tôi'}
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Khai báo nghỉ phép hoặc việc riêng theo giờ Việt Nam. Khoảng bận không được trùng lịch chụp
        đã được giữ.
      </p>
      {admin && (
        <label className="mt-3 block space-y-1">
          Thợ chụp
          <select
            className={inputClass}
            value={photographerId}
            disabled={busy}
            onChange={(e) => setPhotographerId(e.target.value)}
          >
            <option value="">Chọn thợ</option>
            {photographers.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name || p.username}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-destructive">
          {error}{' '}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              setReload((value) => value + 1);
              setUsersReload((value) => value + 1);
            }}
          >
            Thử lại
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {photographerId && (
        <>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(() =>
                photographerService.saveBlock(
                  { photographerId, startAt: `${start}:00+07:00`, endAt: `${end}:00+07:00`, note },
                  id,
                ),
              );
            }}
          >
            <label className="min-w-0 space-y-1">
              Bắt đầu
              <input
                type="datetime-local"
                className={inputClass}
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="min-w-0 space-y-1">
              Kết thúc
              <input
                type="datetime-local"
                className={inputClass}
                required
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              Ghi chú (tùy chọn)
              <input
                className={inputClass}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={busy || !start || !end || end <= start}
                className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50"
              >
                {id ? 'Lưu thay đổi' : 'Thêm lịch bận'}
              </button>
              {id && (
                <button
                  type="button"
                  className="min-h-11 rounded-lg border px-4"
                  disabled={busy}
                  onClick={reset}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </form>
          {loading ? (
            <p role="status" className="mt-3">
              Đang tải lịch bận…
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((row) => (
                <li
                  key={row._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p>
                      {format(row.startAt)} – {format(row.endAt)}
                    </p>
                    {row.note && (
                      <p className="break-words text-sm text-muted-foreground">{row.note}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-11 underline"
                      onClick={() => {
                        setId(row._id);
                        setStart(localInput(row.startAt));
                        setEnd(localInput(row.endAt));
                        setNote(row.note);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-11 text-destructive underline"
                      onClick={() => void mutate(() => photographerService.deleteBlock(row._id))}
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
              {!rows.length && !error && <li>Chưa có lịch bận riêng.</li>}
            </ul>
          )}
        </>
      )}
    </details>
  );
}
