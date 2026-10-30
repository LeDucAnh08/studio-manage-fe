import { useState, useMemo } from 'react';
import { MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DOW_VN,
  SCHEDULE_STATUS_LABEL,
  SCHEDULE_STATUS_COLOR,
} from '../../utils/scheduleConstants';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { vietnamCalendarDate } from '@/utils/vietnamCalendarDate';

export interface CalendarScheduleItem {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  className: string;
  leadName?: string;
  notes?: string;
}

interface Props {
  items: CalendarScheduleItem[];
  maxBadges?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ScheduleCalendar = ({ items, maxBadges = 3, onEdit, onDelete }: Props) => {
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      days.push(year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    }
    return days;
  }, [calendarDate]);
  const byDay = useMemo(() => {
    const map: Record<string, CalendarScheduleItem[]> = {};
    items.forEach((s) => {
      const key = vietnamCalendarDate(s.shootDate);
      (map[key] ??= []).push(s);
    });
    return map;
  }, [items]);
  const today = vietnamCalendarDate(new Date().toISOString());

  return (
    <div className="staff-schedule-calendar rounded-lg overflow-hidden border bg-card">
      <div className="flex items-center justify-between px-3 py-3 border-b gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Tháng trước"
          onClick={() =>
            setCalendarDate(({ year, month }) =>
              month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
            )
          }
        >
          <ChevronLeft />
        </Button>
        <h2 className="text-base font-semibold" aria-live="polite">
          Tháng {calendarDate.month + 1} / {calendarDate.year}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Tháng sau"
          onClick={() =>
            setCalendarDate(({ year, month }) =>
              month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
            )
          }
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {DOW_VN.map((d) => (
          <div key={d} className="text-center text-xs font-medium py-2 text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayItems = day ? (byDay[day] ?? []) : [];
          const isToday = day === today;
          const isSelected = day === selectedDay;
          return (
            <button
              type="button"
              key={day ?? 'blank-' + i}
              disabled={!day}
              aria-hidden={!day || undefined}
              aria-pressed={day ? isSelected : undefined}
              aria-current={isToday ? 'date' : undefined}
              aria-label={
                day
                  ? 'Ngày ' +
                    day.split('-').reverse().join('/') +
                    ', ' +
                    dayItems.length +
                    ' lịch chụp' +
                    (dayItems.length ? ': ' + dayItems.map((s) => s.className).join(', ') : '')
                  : undefined
              }
              onClick={() => day && setSelectedDay(isSelected ? null : day)}
              className={cn(
                'staff-calendar-day',
                isSelected && 'staff-calendar-day--selected',
                isToday && 'staff-calendar-day--today',
              )}
            >
              {day && (
                <>
                  <span className="block text-right mb-1 font-medium">{Number(day.slice(8))}</span>
                  <span className="block space-y-1">
                    {dayItems.slice(0, maxBadges).map((s) => (
                      <span
                        key={s._id}
                        className={cn(
                          'block truncate rounded px-1 py-0.5 text-[11px]',
                          SCHEDULE_STATUS_COLOR[s.status],
                        )}
                      >
                        {s.className}
                      </span>
                    ))}
                    {dayItems.length > maxBadges && (
                      <span className="block text-[11px] text-muted-foreground">
                        +{dayItems.length - maxBadges} lịch
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <section className="border-t p-4 space-y-3" aria-label={'Lịch ngày ' + selectedDay}>
          <h3 className="font-semibold">
            {Number(selectedDay.slice(8))} tháng {Number(selectedDay.slice(5, 7))},{' '}
            {selectedDay.slice(0, 4)}
          </h3>
          {(byDay[selectedDay] ?? []).map((s) => (
            <div key={s._id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold break-words">{s.className}</p>
                  {(s.startTime || s.endTime) && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock size={16} aria-hidden="true" />
                      {s.startTime}
                      {s.endTime ? ' – ' + s.endTime : ''}
                    </p>
                  )}
                  {s.location && (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin size={16} className="shrink-0" aria-hidden="true" />
                      <span className="break-words">{s.location}</span>
                    </p>
                  )}
                  {s.notes && <p className="text-sm whitespace-pre-line">{s.notes}</p>}
                </div>
                <Badge variant="outline" className={SCHEDULE_STATUS_COLOR[s.status]}>
                  {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
                </Badge>
              </div>
              {(onEdit || onDelete) && (
                <div className="staff-row-actions">
                  {onEdit && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="staff-row-action"
                      aria-label={'Sửa lịch ' + s.className}
                      onClick={() => onEdit(s._id)}
                    >
                      Sửa
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="staff-row-action text-destructive"
                      aria-label={'Xoá lịch ' + s.className}
                      onClick={() => onDelete(s._id)}
                    >
                      Xoá
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {!byDay[selectedDay]?.length && (
            <p className="text-sm text-muted-foreground">Không có lịch ngày này</p>
          )}
        </section>
      )}
    </div>
  );
};

export default ScheduleCalendar;
