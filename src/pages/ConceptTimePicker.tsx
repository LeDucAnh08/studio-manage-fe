import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomerImage } from '../components/customer/CustomerImage';
import { type ConceptPackage, type Slot, money } from '../services/conceptService';
import {
  addCalendarMonths,
  calendarDays,
  studioDateLabel,
  studioShortDateLabel,
  studioDay,
  studioTime,
} from '../services/conceptCalendar';
import '../styles/concept-time.css';

interface Props {
  pkg: ConceptPackage;
  image?: string;
  month: string;
  firstDay: string;
  lastDay: string;
  day: string;
  days: Record<string, Slot[]>;
  loading: boolean;
  error: string;
  selected?: Slot;
  selectionUnavailable?: boolean;
  onMonth: (value: string) => void;
  onDay: (value: string) => void;
  onSlot: (value: string) => void;
  onRetry: () => void;
  onNext: () => void;
}
export default function ConceptTimePicker({
  pkg,
  image,
  month,
  firstDay,
  lastDay,
  day,
  days,
  loading,
  error,
  selected,
  selectionUnavailable,
  onMonth,
  onDay,
  onSlot,
  onRetry,
  onNext,
}: Props) {
  const dates = calendarDays(month);
  const offset = (new Date(`${month}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells = Array.from(
    { length: Math.ceil((offset + dates.length) / 7) * 7 },
    (_, i) => dates[i - offset],
  );
  const activeDay = day.startsWith(month.slice(0, 7)) ? day : '';
  const slots = activeDay ? days[activeDay] || [] : [];
  const monthLabel = `Tháng ${Number(month.slice(5, 7))}, ${month.slice(0, 4)}`;
  const selectedDay = selected ? studioDay(selected.startAt) : '';
  return (
    <>
      <header className="concept-time-heading">
        <Link className="concept-time-back" to={`/concept-booking/packages/${pkg._id}`}>
          <ArrowLeft size={18} aria-hidden="true" />
          Quay lại chi tiết gói
        </Link>
        <h1>Chọn thời gian buổi chụp</h1>
        <p>Chọn ngày và khung giờ phù hợp với bạn.</p>
      </header>
      <div className="concept-time-package">
        {image && <CustomerImage src={image} alt={pkg.name} width={206} height={110} priority />}
        <div className="concept-time-package__details">
          <h2>{pkg.name}</h2>
          <p>
            {pkg.durationMinutes} phút · {pkg.retouchQuota} ảnh chỉnh sửa
          </p>
          <strong>{money(pkg.price)} / buổi</strong>
        </div>
      </div>
      <div className="concept-time-layout">
        <section className="concept-month" aria-label="Chọn ngày chụp" aria-busy={loading}>
          <div className="concept-month-heading">
            <button
              aria-label="Tháng trước"
              disabled={month <= firstDay.slice(0, 7) + '-01'}
              onClick={() => onMonth(addCalendarMonths(month, -1))}
            >
              <ChevronLeft size={22} />
            </button>
            <h2 aria-live="polite">{monthLabel}</h2>
            <button
              aria-label="Tháng sau"
              disabled={addCalendarMonths(month, 1) > lastDay}
              onClick={() => onMonth(addCalendarMonths(month, 1))}
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <table className="concept-month-grid">
            <caption className="sr-only">{monthLabel}</caption>
            <thead>
              <tr>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((date, col) => (
                    <td key={col}>
                      {date && (
                        <button
                          type="button"
                          data-date={date}
                          aria-label={studioDateLabel(date, true)}
                          aria-pressed={activeDay === date && !error && !!days[date]?.length}
                          aria-current={date === firstDay ? 'date' : undefined}
                          disabled={
                            date < firstDay ||
                            date > lastDay ||
                            loading ||
                            !!error ||
                            !days[date]?.length
                          }
                          onClick={() => onDay(date)}
                        >
                          {Number(date.slice(8))}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="concept-calendar-legend" aria-label="Chú thích lịch">
            <li>
              <Circle size={16} className="legend-today" aria-hidden="true" />
              Hôm nay
            </li>
            <li>
              <Circle size={16} className="legend-selected" aria-hidden="true" />
              Ngày đã chọn
            </li>
            <li>
              <Circle size={16} aria-hidden="true" />
              Có thể đặt
            </li>
            <li>
              <Circle size={16} className="legend-unavailable" aria-hidden="true" />
              Không khả dụng
            </li>
          </ul>
        </section>
        <section
          className="concept-time-slots"
          aria-labelledby="concept-time-day-heading"
          aria-busy={loading}
        >
          <h2 id="concept-time-day-heading">
            {activeDay ? studioDateLabel(activeDay) : 'Chọn ngày trên lịch'}
          </h2>
          <p>Mỗi buổi chụp kéo dài {pkg.durationMinutes} phút.</p>
          {loading ? (
            <p className="concept-time-status" role="status">
              Đang kiểm tra lịch trống…
            </p>
          ) : error ? (
            <div className="concept-time-status" role="alert">
              <p>{error}</p>
              <button className="concept-time-retry" onClick={onRetry}>
                Thử tải lại lịch
              </button>
            </div>
          ) : !activeDay ? (
            <p className="concept-time-status">Chọn một ngày có thể đặt để xem các khung giờ.</p>
          ) : !slots.length ? (
            <p className="concept-time-status">
              Ngày này chưa có khung giờ trống. Bạn vui lòng chọn ngày khác.
            </p>
          ) : (
            <>
              {[
                { title: 'Buổi sáng', afternoon: false },
                { title: 'Buổi chiều', afternoon: true },
              ].map((group) => {
                const items = slots.filter(
                  (slot) => Number(studioTime(slot.startAt).slice(0, 2)) >= 12 === group.afternoon,
                );
                return (
                  items.length > 0 && (
                    <div className="concept-time-group" key={group.title}>
                      <h3>{group.title}</h3>
                      <div className="concept-time-buttons">
                        {items.map((slot) => (
                          <button
                            key={slot.startAt}
                            aria-pressed={selected?.startAt === slot.startAt}
                            onClick={() => onSlot(slot.startAt)}
                          >
                            {studioTime(slot.startAt)}–{studioTime(slot.endAt)}
                            {selected?.startAt === slot.startAt && (
                              <Check size={16} aria-hidden="true" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                );
              })}
            </>
          )}
        </section>
      </div>
      <footer className="concept-time-footer">
        <div className="concept-time-confirmation" role="status" aria-live="polite">
          <CalendarDays size={28} strokeWidth={1.5} aria-hidden="true" />
          <div>
            {selected ? (
              <>
                <strong>{studioShortDateLabel(selectedDay)}</strong>
                <p>
                  {studioTime(selected.startAt)}–{studioTime(selected.endAt)} ·{' '}
                  {pkg.durationMinutes} phút
                </p>
              </>
            ) : (
              <>
                <strong>
                  {selectionUnavailable
                    ? 'Khung giờ đã chọn không còn khả dụng'
                    : 'Chưa chọn khung giờ'}
                </strong>
                <p>
                  {selectionUnavailable
                    ? 'Vui lòng chọn khung giờ khác.'
                    : 'Chọn ngày và giờ để tiếp tục.'}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="concept-time-next">
          <button disabled={!selected || loading || !!error} onClick={onNext}>
            Tiếp tục <ArrowRight size={22} aria-hidden="true" />
          </button>
          <p>Tiếp theo: chọn thợ chụp</p>
        </div>
        <p className="concept-time-note">
          <Info size={18} aria-hidden="true" />
          Khung giờ sẽ được kiểm tra lại khi đặt lịch.
        </p>
      </footer>
    </>
  );
}
