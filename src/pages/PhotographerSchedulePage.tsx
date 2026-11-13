import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  UserRoundCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { scheduleService, type PersonalSchedule } from '../services/scheduleService';
import { vietnamCalendarDate } from '../utils/vietnamCalendarDate';
import '../styles/personal-shoot-calendar.css';

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const calendarDate = (day: string) => new Date(`${day}T00:00:00Z`);
const dayLabel = (day: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(calendarDate(day));
const statusLabels: Record<PersonalSchedule['status'], string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã chốt lịch',
  completed: 'Đã chụp',
  cancelled: 'Đã hủy',
};
const timeLabel = (event: PersonalSchedule) =>
  event.startTime
    ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}`
    : 'Chưa chốt giờ';

export default function PhotographerSchedulePage() {
  const { user } = useAuth();
  const today = vietnamCalendarDate(new Date().toISOString());
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    events: PersonalSchedule[];
    error: boolean;
  } | null>(null);
  const days = useMemo(() => {
    const first = calendarDate(`${month}-01`);
    const offset = (first.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) =>
      dateKey(new Date(+first + (index - offset) * 86400000)),
    );
  }, [month]);
  const from = days[0];
  const to = days[41];
  const requestKey = `${user?._id}:${from}:${retry}`;
  const loading = result?.key !== requestKey;
  const error = !loading && result?.error;
  const events = useMemo(
    () => (result?.key === requestKey ? result.events : []),
    [result, requestKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    scheduleService.myCalendar(from, to, controller.signal).then(
      (items) => {
        if (current) setResult({ key: requestKey, events: items, error: false });
      },
      () => {
        if (current) setResult({ key: requestKey, events: [], error: true });
      },
    );
    return () => {
      current = false;
      controller.abort();
    };
  }, [from, to, requestKey]);

  useEffect(() => {
    if (!activeEvent) return;
    const detail = document.getElementById(`pc-session-${activeEvent}`);
    detail?.focus({ preventScroll: true });
    if (window.innerWidth <= 1100)
      detail?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [activeEvent]);

  const byDay = useMemo(() => {
    const grouped = new Map<string, PersonalSchedule[]>();
    for (const event of events) {
      const key = vietnamCalendarDate(event.shootDate);
      grouped.set(key, [...(grouped.get(key) || []), event]);
    }
    for (const items of grouped.values())
      items.sort(
        (a, b) =>
          (a.startTime || '24:00').localeCompare(b.startTime || '24:00') ||
          a._id.localeCompare(b._id),
      );
    return grouped;
  }, [events]);
  const selectedEvents = byDay.get(selected) || [];
  const monthCount = events.filter((event) =>
    vietnamCalendarDate(event.shootDate).startsWith(month),
  ).length;
  const selectedDate = calendarDate(selected);
  const selectDay = (day: string, eventId: string | null = null) => {
    setMonth(day.slice(0, 7));
    setSelected(day);
    setActiveEvent(eventId);
  };
  const moveMonth = (offset: number) => {
    const first = calendarDate(`${month}-01`);
    first.setUTCMonth(first.getUTCMonth() + offset);
    const next = dateKey(first);
    setMonth(next.slice(0, 7));
    selectDay(next);
  };

  return (
    <section id="yume-personal-calendar" aria-label="Lịch chụp cá nhân">
      <header className="pc-page-heading">
        <div>
          <h1>Lịch chụp của tôi</h1>
          <p className="pc-subtitle">Theo dõi các buổi chụp bạn được phân công.</p>
        </div>
        <span className="pc-scope">
          <UserRoundCheck aria-hidden="true" />
          {user?.name || user?.username}
        </span>
      </header>
      {error && (
        <div className="pc-feedback" role="alert">
          Không tải được lịch chụp.{' '}
          <button className="pc-control" onClick={() => setRetry((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      <div className="pc-workspace">
        <div>
          <section className="pc-calendar" aria-label="Lịch chụp theo tháng" aria-busy={loading}>
            <div className="pc-toolbar">
              <div className="pc-month-info">
                <h2 id="pc-month-title" aria-live="polite">
                  Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
                </h2>
                <p role="status">
                  {loading
                    ? 'Đang tải lịch chụp…'
                    : error
                      ? 'Chưa tải được lịch'
                      : `${monthCount} lịch được phân công`}
                </p>
              </div>
              <div className="pc-month-actions">
                <button
                  type="button"
                  className="pc-control"
                  onClick={() => {
                    setMonth(today.slice(0, 7));
                    selectDay(today);
                  }}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className="pc-control pc-icon-control"
                  aria-label="Tháng trước"
                  onClick={() => moveMonth(-1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="pc-control pc-icon-control"
                  aria-label="Tháng sau"
                  onClick={() => moveMonth(1)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="pc-weekdays" aria-hidden="true">
              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="pc-days" role="grid" aria-labelledby="pc-month-title">
              {Array.from({ length: 6 }, (_, week) => (
                <div className="pc-week" role="row" key={week}>
                  {days.slice(week * 7, week * 7 + 7).map((day) => {
                    const items = byDay.get(day) || [];
                    return (
                      <div
                        key={day}
                        role="gridcell"
                        aria-selected={selected === day}
                        data-day={day}
                        className={`pc-day${day.startsWith(month) ? '' : ' pc-outside'}${selected === day ? ' pc-selected' : ''}${today === day ? ' pc-today' : ''}`}
                        onClick={() => selectDay(day)}
                      >
                        <button
                          type="button"
                          className="pc-day-number"
                          aria-current={today === day ? 'date' : undefined}
                          aria-label={`${dayLabel(day)}, ${items.length} buổi chụp`}
                          onClick={() => selectDay(day)}
                        >
                          {Number(day.slice(8))}
                        </button>
                        <div className="pc-cell-events">
                          {items.slice(0, 2).map((event) => (
                            <button
                              key={event._id}
                              type="button"
                              className="pc-event"
                              data-kind={event.service}
                              data-cancelled={event.status === 'cancelled'}
                              aria-label={`${timeLabel(event)}, ${event.title}, ${statusLabels[event.status]}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectDay(day, event._id);
                              }}
                            >
                              <span className="pc-event-time">
                                {event.startTime || 'Chưa chốt giờ'}
                              </span>
                              <span className="pc-event-title">{event.title}</span>
                            </button>
                          ))}
                          {items.length > 2 && (
                            <button
                              type="button"
                              className="pc-more"
                              onClick={() => selectDay(day)}
                            >
                              +{items.length - 2} lịch khác
                            </button>
                          )}
                        </div>
                        {items.length > 0 && (
                          <span className="pc-mobile-count" aria-hidden="true">
                            {items.slice(0, 2).map((event) => (
                              <b
                                key={event._id}
                                className={`pc-dot${event.status === 'cancelled' ? ' pc-dot-cancelled' : event.service === 'yearbook' ? ' pc-dot-yearbook' : ''}`}
                              />
                            ))}
                            {items.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
          <div className="pc-legend" aria-label="Chú giải lịch chụp">
            <span>
              <b className="pc-dot" aria-hidden="true" />
              Chụp concept
            </span>
            <span>
              <b className="pc-dot pc-dot-yearbook" aria-hidden="true" />
              Chụp kỉ yếu
            </span>
            <span>
              <b className="pc-dot pc-dot-cancelled" aria-hidden="true" />
              Đã hủy
            </span>
            <span className="pc-timezone">Giờ Việt Nam · GMT+7</span>
          </div>
        </div>
        <aside className="pc-detail" aria-label="Chi tiết ngày đã chọn">
          <header className="pc-detail-header">
            <p>
              {new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'long' }).format(
                selectedDate,
              )}
            </p>
            <h2>
              {selectedDate.getUTCDate()} tháng {selectedDate.getUTCMonth() + 1}
              {selected.slice(0, 4) !== month.slice(0, 4) ? `, ${selected.slice(0, 4)}` : ''}
            </h2>
            <div className="pc-detail-count">
              {loading
                ? 'Đang tải…'
                : error
                  ? 'Chưa tải được lịch'
                  : `${selectedEvents.length} buổi chụp`}
            </div>
          </header>
          <div className="pc-detail-body" aria-live="polite">
            {!loading && !error && selectedEvents.length === 0 && (
              <div className="pc-empty">
                <CalendarDays aria-hidden="true" />
                <p>Chưa có lịch chụp</p>
                <p>Bạn chưa được phân công buổi chụp nào trong ngày này.</p>
              </div>
            )}
            {selectedEvents.map((event) => (
              <article
                key={event._id}
                id={`pc-session-${event._id}`}
                tabIndex={-1}
                className={`pc-session${activeEvent === event._id ? ' pc-selected-session' : ''}`}
              >
                <div className="pc-session-time">
                  <Clock3 aria-hidden="true" />
                  {timeLabel(event)}
                </div>
                <span className="pc-status" data-status={event.status}>
                  {statusLabels[event.status]}
                </span>
                <h3>{event.title}</h3>
                <p className="pc-session-kind">
                  {event.service === 'concept' ? 'Chụp concept' : 'Chụp kỉ yếu'}
                </p>
                <p className="pc-session-fact">
                  <MapPin aria-hidden="true" />
                  {event.location || 'Chưa chốt địa điểm'}
                </p>
                <div className="pc-role">
                  Vai trò của bạn ·{' '}
                  <strong>{event.role === 'lead' ? 'Thợ chính' : 'Thợ phụ'}</strong>
                </div>
                {event.notes && (
                  <details>
                    <summary>Thông tin chuẩn bị</summary>
                    <p className="pc-notes">{event.notes}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
