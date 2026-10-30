import { useEffect, useState } from 'react';
import {
  photographerService,
  availabilityKey,
  type AvailabilityResult,
} from '../services/photographerService';
const dateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export function PhotographerAvailabilityPicker({
  startAt,
  endAt,
  bookingId,
  version,
  selected,
  onChange,
  multiple = false,
  primaryId,
  lockPrimary = true,
  onLoaded,
}: {
  startAt: string;
  endAt: string;
  bookingId: string;
  version: number;
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  primaryId?: string;
  lockPrimary?: boolean;
  onLoaded?: (result: AvailabilityResult | null) => void;
}) {
  const [result, setResult] = useState<
    (AvailabilityResult & { checkedAt: string; refreshed: boolean }) | null
  >(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const key = availabilityKey(startAt, endAt, bookingId, version);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    onLoaded?.(null);
    if (
      !Number.isFinite(Date.parse(startAt)) ||
      !Number.isFinite(Date.parse(endAt)) ||
      Date.parse(endAt) <= Date.parse(startAt)
    ) {
      setError('Cần ngày và khung giờ hợp lệ để kiểm tra lịch trống.');
      setLoading(false);
      return;
    }
    photographerService
      .availability(startAt, endAt, bookingId)
      .then((rows) => {
        if (!active) return;
        const next = { key, rows };
        setResult({ ...next, checkedAt: new Date().toISOString(), refreshed: reload > 0 });
        onLoaded?.(next);
      })
      .catch((e) => {
        if (active)
          setError(
            e?.response?.data?.message || 'Không kiểm tra được lịch trống. Vui lòng thử lại.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, startAt, endAt, bookingId, reload, onLoaded]);
  const current = result?.key === key ? result : null;
  const validRange = Number.isFinite(Date.parse(startAt)) && Number.isFinite(Date.parse(endAt));
  return (
    <fieldset className="min-w-0 space-y-3" aria-busy={loading}>
      <legend className="font-medium">
        {multiple ? 'Thợ chính và thợ hỗ trợ' : 'Chọn thợ phụ trách'}
      </legend>
      {validRange && (
        <p className="text-sm text-muted-foreground">
          Kiểm tra {dateTime(startAt)} – {dateTime(endAt)}. Chừa 60 phút giữa hai buổi chụp.
        </p>
      )}
      {!error && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {loading
            ? 'Đang kiểm tra lịch trống…'
            : current && (
                <>
                  {current.refreshed ? 'Đã kiểm tra lại lúc ' : 'Đã kiểm tra lúc '}
                  {new Date(current.checkedAt).toLocaleTimeString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })}
                  : {current.rows.filter((row) => row.status === 'available').length} thợ trống,{' '}
                  {current.rows.filter((row) => row.status === 'busy').length} bận,{' '}
                  {current.rows.filter((row) => row.status === 'unknown').length} chưa xác định.
                </>
              )}
        </p>
      )}
      {error ? (
        <div role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            className="mt-2 min-h-11 text-sm font-medium underline"
            onClick={() => setReload((n) => n + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : current ? (
        <>
          {!current.rows.length && <p>Chưa có thợ chụp đang hoạt động.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {current.rows.map((row) => (
              <div key={row._id} className="min-w-0 rounded-xl border p-3">
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    name={multiple ? undefined : `photographer-${bookingId}`}
                    checked={selected.includes(row._id)}
                    disabled={
                      loading ||
                      (row.status !== 'available' && !selected.includes(row._id)) ||
                      (lockPrimary && row._id === primaryId) ||
                      (multiple && selected.length >= 10 && !selected.includes(row._id))
                    }
                    onChange={() =>
                      onChange(
                        multiple
                          ? selected.includes(row._id)
                            ? selected.filter((id) => id !== row._id)
                            : [...selected, row._id]
                          : [row._id],
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="font-medium break-words">
                      {row.name}
                      {row._id === primaryId ? ' · Thợ chính' : ''}
                    </span>
                    <span className="block text-sm">
                      {row.status === 'available'
                        ? 'Trống lịch'
                        : row.status === 'busy'
                          ? 'Bận'
                          : 'Chưa xác định'}
                    </span>
                  </span>
                </label>
                {row.conflicts.map((message, i) => (
                  <p key={i} className="text-sm text-destructive">
                    {message}
                  </p>
                ))}
                {row.schedules.length > 0 && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer py-2">
                      Lịch chụp trong ngày ({row.schedules.length})
                    </summary>
                    <ul className="space-y-2">
                      {row.schedules.map((schedule) => (
                        <li key={schedule._id}>
                          {new Date(schedule.shootDate).toLocaleDateString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                          })}{' '}
                          · {schedule.startTime || '?'}–{schedule.endTime || '?'} ·{' '}
                          {schedule.location || 'Chưa có địa điểm'}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {!error && (
        <div>
          <button
            type="button"
            className="min-h-11 rounded-lg border px-4 text-sm font-medium disabled:opacity-50"
            disabled={loading || !validRange}
            onClick={() => setReload((n) => n + 1)}
          >
            {loading ? 'Đang kiểm tra…' : 'Kiểm tra lại lịch trống'}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            Tải lại để cập nhật các lịch chụp và lịch bận vừa thay đổi.
          </p>
        </div>
      )}
    </fieldset>
  );
}
