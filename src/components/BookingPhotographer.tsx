import { useState } from 'react';
import type { BookingWorkflowDto } from '../services/bookingWorkflowService';
import {
  photographerWindow,
  availabilityKey,
  type AvailabilityResult,
} from '../services/photographerService';
import { PhotographerAvailabilityPicker } from './PhotographerAvailabilityPicker';

export function BookingPhotographer({
  record,
  admin,
  busy,
  onAssign,
}: {
  record: BookingWorkflowDto;
  admin: boolean;
  busy: boolean;
  onAssign: (ids: string[]) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const { booking, workflow } = record;
  const photographer = workflow.assignedPhotographer;
  const supports = workflow.assignedSupportPhotographers ?? [];
  const schedule = workflow.resources?.scheduleDetails ?? workflow.quote?.proposedSchedule;
  const window = schedule
    ? photographerWindow(schedule)
    : { startAt: booking.startAt, endAt: booking.endAt };
  const key = availabilityKey(window.startAt, window.endAt, booking._id, workflow.version);
  const canEdit =
    admin &&
    !['rejected', 'cancelled'].includes(booking.status) &&
    ['intake', 'quoting', 'awaiting_deposit', 'ready_to_confirm', 'confirmed'].includes(
      workflow.lifecycle,
    ) &&
    !['requested', 'proposed', 'accepted'].includes(workflow.changeRequest?.status ?? '');
  const valid =
    selected.length > 0 &&
    selected.length <= 10 &&
    availability?.key === key &&
    selected.every((id) =>
      availability.rows.some((row) => row._id === id && row.status === 'available'),
    );
  const name = (id: string) =>
    availability?.rows.find((row) => row._id === id)?.name ??
    (photographer?._id === id ? photographer.name : supports.find((row) => row._id === id)?.name) ??
    'Thợ không còn hoạt động';
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Thợ phụ trách</h2>
          <p className="mt-1">{photographer?.name || 'Chưa phân công'}</p>
          {supports.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Thợ hỗ trợ: {supports.map((row) => row.name).join(', ')}
            </p>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-lg border px-4 text-sm font-medium"
            onClick={() => {
              setEditing((value) => !value);
              setSelected(
                photographer ? [photographer._id, ...supports.map((row) => row._id)] : [],
              );
            }}
          >
            {editing ? 'Đóng phân công' : photographer ? 'Đổi thợ' : 'Gắn thợ'}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {booking.status === 'cancelled' || workflow.lifecycle === 'cancelled' ? (
          'Đơn đã hủy. Thông tin phân công được giữ để tra cứu.'
        ) : (
          <>
            Thợ phụ trách chăm khách và làm thợ chính.{' '}
            {workflow.resources?.scheduleId
              ? 'Lịch chụp đã được xác nhận.'
              : workflow.packageReservation?.status === 'held'
                ? 'Ekip đang được giữ lịch tạm trong thời hạn đặt cọc.'
                : 'Phân công này chưa giữ khung giờ chụp; studio kiểm tra lại khi chốt lịch.'}
          </>
        )}
      </p>
      {editing && canEdit && (
        <>
          <p className="text-sm text-muted-foreground">
            Chọn từ 1 đến 10 thợ. Một thợ chính kiêm chăm khách, những người còn lại hỗ trợ chụp.
          </p>
          <PhotographerAvailabilityPicker
            {...window}
            bookingId={booking._id}
            version={workflow.version}
            selected={selected}
            onChange={setSelected}
            onLoaded={setAvailability}
            multiple
            primaryId={selected[0]}
            lockPrimary={false}
          />
          {selected.length > 0 && (
            <label className="block space-y-1 text-sm font-medium">
              Thợ chính / người chăm khách
              <select
                className="min-h-11 w-full rounded-lg border bg-background px-3"
                value={selected[0]}
                disabled={busy}
                onChange={(event) =>
                  setSelected([
                    event.target.value,
                    ...selected.filter((id) => id !== event.target.value),
                  ])
                }
              >
                {selected.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {availability?.key === key &&
            selected
              .filter((id) => !availability.rows.some((row) => row._id === id))
              .map((id) => (
                <p key={id} className="text-sm text-destructive">
                  {name(id)}{' '}
                  <button
                    type="button"
                    className="min-h-11 underline"
                    onClick={() => setSelected((ids) => ids.filter((value) => value !== id))}
                  >
                    Bỏ khỏi phân công
                  </button>
                </p>
              ))}
          <button
            type="button"
            disabled={busy || !valid}
            className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50"
            onClick={async () => {
              const saved = await onAssign(selected);
              if (saved) setEditing(false);
            }}
          >
            Lưu phân công
          </button>
        </>
      )}
    </section>
  );
}
