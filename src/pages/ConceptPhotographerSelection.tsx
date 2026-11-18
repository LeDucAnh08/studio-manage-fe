import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Tag,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomerImage } from '../components/customer/CustomerImage';
import { conceptBookingPath, conceptPhotographerPath } from '../services/conceptDraft';
import { studioDateLabel, studioDay, studioTime } from '../services/conceptCalendar';
import { money, type ConceptPackage, type Slot } from '../services/conceptService';
import '../styles/concept-photographer-selection.css';

interface Props {
  pkg: ConceptPackage;
  startAt: string;
  slot?: Slot;
  selectedId: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onNext: () => void;
}

export default function ConceptPhotographerSelection({
  pkg,
  startAt,
  slot,
  selectedId,
  loading,
  error,
  onRetry,
  onNext,
}: Props) {
  const people = !loading && !error ? slot?.photographers || [] : [];
  const selected = people.find((person) => person._id === selectedId);
  const endAt = new Date(Date.parse(startAt) + pkg.durationMinutes * 60000).toISOString();
  return (
    <section className="cps" aria-labelledby="photographer-selection-title">
      <div className="cps-topline">
        <Link className="app-back-link cps-back" to={conceptBookingPath(pkg._id, 'date')}>
          <ArrowLeft size={22} aria-hidden="true" />
          Quay lại chọn thời gian
        </Link>
        <span>Chọn thợ chụp</span>
      </div>
      <h1 id="photographer-selection-title">Chọn người kể câu chuyện của bạn</h1>
      <p className="cps-intro" aria-live="polite">
        {loading
          ? 'Đang tìm thợ có thể nhận lịch bạn đã chọn…'
          : error
            ? 'Chưa thể kiểm tra lịch thợ chụp.'
            : people.length
              ? `${people.length} thợ chụp có thể nhận lịch bạn đã chọn.`
              : 'Chưa có thợ chụp nhận khung giờ này.'}
      </p>
      <div className="cps-session" aria-label="Buổi chụp đã chọn">
        <div>
          <Camera aria-hidden="true" />
          <strong>{pkg.name}</strong>
        </div>
        <div>
          <CalendarDays aria-hidden="true" />
          <span>
            <strong>{studioDateLabel(studioDay(startAt), true)}</strong>
            <small>
              {studioTime(startAt)}–{studioTime(endAt)}
            </small>
          </span>
        </div>
        <div>
          <Clock3 aria-hidden="true" />
          <span>{pkg.durationMinutes} phút</span>
        </div>
        <div>
          <Tag aria-hidden="true" />
          <strong>{money(pkg.price)}</strong>
        </div>
      </div>
      {error && (
        <div className="cps-notice" role="alert">
          <p>{error}</p>
          <button onClick={onRetry}>Kiểm tra lại lịch</button>
        </div>
      )}
      {!loading && !error && !people.length && (
        <p className="cps-notice">
          Khung giờ này không còn trống. Bạn vui lòng quay lại chọn thời gian.
        </p>
      )}
      {!loading && !error && people.length > 0 && selectedId && !selected && (
        <p className="cps-notice" role="status">
          Thợ đã chọn không còn nhận lịch này. Vui lòng xem hồ sơ và chọn thợ khác.
        </p>
      )}
      <div className="cps-grid" aria-label="Thợ chụp nhận lịch này" aria-busy={loading}>
        {people.map((person, index) => (
          <article
            className="cps-card"
            key={person._id}
            data-selected={selectedId === person._id}
            aria-labelledby={`photographer-${person._id}`}
          >
            {person.portraitUrl ? (
              <CustomerImage
                className="cps-portrait"
                src={person.portraitUrl}
                alt={`Chân dung ${person.name}`}
                width={900}
                height={1125}
                priority={index < 2}
              />
            ) : (
              <div
                className="cps-portrait cps-missing-portrait"
                role="img"
                aria-label={`Chưa có ảnh chân dung ${person.name}`}
              >
                <UserRound size={64} aria-hidden="true" />
              </div>
            )}
            <div className="cps-identity">
              {selectedId === person._id && (
                <span className="cps-selected">
                  <Check size={20} aria-hidden="true" />
                  Đã chọn
                </span>
              )}
              <h2 id={`photographer-${person._id}`}>{person.name}</h2>
              {(person.tagline || person.bio) && (
                <p className="cps-quote">{person.tagline ? `“${person.tagline}”` : person.bio}</p>
              )}
              {person.title && (
                <p className="cps-specialty">
                  <Camera size={24} aria-hidden="true" />
                  {person.title}
                </p>
              )}
              <Link
                className="cps-profile-link"
                to={conceptPhotographerPath(pkg._id, person._id)}
                aria-label={`Xem hồ sơ ${person.name}`}
              >
                Xem hồ sơ
                <ArrowRight size={22} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <footer className="cps-decision">
        <strong role="status">
          {loading
            ? 'Đang kiểm tra lịch thợ…'
            : selected
              ? `Đã chọn ${selected.name}`
              : 'Xem hồ sơ và chọn thợ chụp'}
        </strong>
        <div>
          <span>Tiếp theo: thông tin buổi chụp</span>
          <button className="cps-next" disabled={!selected} onClick={onNext}>
            Tiếp tục
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  );
}
