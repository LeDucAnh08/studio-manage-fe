import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { CustomerImage } from '../components/customer/CustomerImage';
import { useAuth } from '../context/AuthContext';
import { useConceptCatalog } from '../hooks/useConceptCatalog';
import { conceptError, conceptService, type PublicPhotographer } from '../services/conceptService';
import { conceptBookingPath, readConceptDraft, writeConceptDraft } from '../services/conceptDraft';
import { studioDay, studioShortDateLabel, studioTime } from '../services/conceptCalendar';
import '../styles/concept-photographer.css';

export default function ConceptPhotographerPage() {
  const { packageId = '', photographerId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { catalog, error: catalogError, reload: reloadCatalog } = useConceptCatalog();
  const [profile, setProfile] = useState<PublicPhotographer | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [availability, setAvailability] = useState<'loading' | 'available' | 'unavailable'>(
    'loading',
  );
  const [choiceError, setChoiceError] = useState('');
  const [choosing, setChoosing] = useState(false);
  const selectionRequest = useRef<AbortController | null>(null);
  const draft = readConceptDraft(user?._id || null);
  const pkg = catalog?.packages.find((p) => p._id === packageId);
  const startAt =
    draft.packageId === packageId && Number.isFinite(Date.parse(draft.startAt))
      ? draft.startAt
      : '';
  const endAt =
    pkg && startAt ? new Date(Date.parse(startAt) + pkg.durationMinutes * 60000).toISOString() : '';
  const sessionTime = startAt ? studioTime(startAt) + (endAt ? `–${studioTime(endAt)}` : '') : '';
  const back = startAt
    ? conceptBookingPath(packageId, 'photographer')
    : `/concept-booking/packages/${packageId}`;
  useEffect(() => {
    const abort = new AbortController();
    setProfile(null);
    setError('');
    conceptService
      .photographer(photographerId, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setProfile(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      });
    return () => abort.abort();
  }, [photographerId, revision]);
  useEffect(() => () => selectionRequest.current?.abort(), []);
  useEffect(() => {
    if (!pkg || !startAt) {
      setAvailability('unavailable');
      return;
    }
    const abort = new AbortController();
    setAvailability('loading');
    setChoiceError('');
    conceptService
      .availability(pkg._id, studioDay(startAt), abort.signal)
      .then((result) => {
        if (!abort.signal.aborted)
          setAvailability(
            result.slots.some(
              (s) => s.startAt === startAt && s.photographers.some((p) => p._id === photographerId),
            )
              ? 'available'
              : 'unavailable',
          );
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setAvailability('unavailable');
          setChoiceError(conceptError(e));
        }
      });
    return () => abort.abort();
  }, [pkg, startAt, photographerId, revision]);
  const select = async () => {
    if (!pkg || !startAt || !profile || choosing) return;
    const abort = new AbortController();
    selectionRequest.current = abort;
    setChoosing(true);
    setChoiceError('');
    try {
      const result = await conceptService.availability(pkg._id, studioDay(startAt), abort.signal);
      if (abort.signal.aborted) return;
      if (
        Date.parse(startAt) <= Date.now() ||
        !result.slots.some(
          (s) => s.startAt === startAt && s.photographers.some((p) => p._id === photographerId),
        )
      ) {
        setAvailability('unavailable');
        setChoiceError(
          'Thợ không còn trống ở khung giờ này. Bạn vui lòng chọn lại thời gian hoặc thợ khác.',
        );
        return;
      }
      writeConceptDraft({
        ...draft,
        photographerId,
        step: 4,
        key: crypto.randomUUID(),
        ...(draft.photographerId !== photographerId ? { costumes: [] } : {}),
      });
      navigate(conceptBookingPath(packageId, 'costumes'));
    } catch (e) {
      if (!abort.signal.aborted) setChoiceError(conceptError(e));
    } finally {
      if (!abort.signal.aborted) setChoosing(false);
    }
  };
  return (
    <PublicSiteLayout source="concepts">
      <div className="photographer-page">
        <Link className="app-back-link photographer-back" to={back}>
          <ArrowLeft size={18} aria-hidden="true" />
          {startAt ? 'Quay lại danh sách thợ' : 'Quay lại chi tiết gói'}
        </Link>
        {(error || catalogError) && (
          <div className="photographer-notice" role="alert">
            <h1>Chưa thể mở hồ sơ thợ</h1>
            <p>{error || catalogError}</p>
            <button
              onClick={() => {
                reloadCatalog();
                setRevision((n) => n + 1);
              }}
            >
              Thử tải lại
            </button>
          </div>
        )}
        {!profile && !error && <p role="status">Đang tải hồ sơ thợ…</p>}
        {profile && (
          <>
            <header
              className={`photographer-hero${!profile.portraitUrl ? ' photographer-hero--text' : ''}`}
            >
              {profile.portraitUrl && (
                <CustomerImage
                  src={profile.portraitUrl}
                  alt={`Chân dung ${profile.name}`}
                  width={340}
                  height={440}
                  priority
                />
              )}
              <div className="photographer-identity">
                <p className="photographer-eyebrow">Nhiếp ảnh gia tại Yume Studio</p>
                <h1>{profile.name}</h1>
                {(profile.title || profile.concepts.length > 0) && (
                  <p className="photographer-role">
                    {profile.title || profile.concepts.map((c) => c.name).join(' · ')}
                  </p>
                )}
                {profile.tagline && <h2>{profile.tagline}</h2>}
                {(profile.story || profile.bio) && (
                  <div className="photographer-prose">
                    {(profile.story || profile.bio || '').split(/\n\s*\n/).map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                )}
                <dl className="photographer-facts">
                  {[
                    { label: 'Sở trường', value: profile.specialty },
                    { label: 'Phong cách', value: profile.style },
                    { label: 'Cách hướng dẫn', value: profile.guidance },
                  ]
                    .filter((item) => item.value?.trim())
                    .map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                </dl>
                <div className="photographer-select">
                  <button
                    disabled={!pkg || availability !== 'available' || choosing || !!error}
                    onClick={() => void select()}
                  >
                    <Check size={20} aria-hidden="true" />
                    {choosing ? 'Đang kiểm tra lịch…' : `Chọn ${profile.name}`}
                  </button>
                  {startAt && (
                    <p>
                      Cho buổi chụp {studioShortDateLabel(studioDay(startAt))} · {sessionTime}
                    </p>
                  )}
                  {availability === 'loading' && pkg && startAt && (
                    <p role="status">Đang kiểm tra lịch của thợ…</p>
                  )}
                  {availability === 'unavailable' && !choiceError && (
                    <p>
                      {startAt
                        ? 'Thợ chưa có lịch trống cho khung giờ này.'
                        : 'Chọn thời gian trước để tiếp tục đặt lịch.'}
                    </p>
                  )}
                  {choiceError && <p role="alert">{choiceError}</p>}
                  {availability === 'unavailable' && (
                    <div className="photographer-inline-actions">
                      <Link
                        to={
                          draft.packageId === packageId
                            ? conceptBookingPath(packageId)
                            : `/concept-booking/packages/${packageId}`
                        }
                      >
                        Chọn thời gian
                      </Link>
                      {startAt && (
                        <button onClick={() => setRevision((n) => n + 1)}>Kiểm tra lại lịch</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>
            {(profile.philosophy || !!profile.approach?.length) && (
              <section className="photographer-section photographer-working">
                {profile.philosophy && (
                  <div>
                    <h2>Điều tôi chú trọng</h2>
                    <p className="photographer-prose">{profile.philosophy}</p>
                  </div>
                )}
                {!!profile.approach?.length && (
                  <div>
                    <h2>Buổi chụp cùng tôi</h2>
                    {profile.approach.map((item, i) => (
                      <article key={i}>
                        <h3>{item.title}</h3>
                        {item.description && <p>{item.description}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {!!profile.audience?.length && (
              <section className="photographer-section">
                <h2>Phù hợp nếu bạn…</h2>
                <div className="photographer-audience">
                  {profile.audience.map((item, i) => (
                    <article key={i}>
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {!!profile.milestones?.length && (
              <section className="photographer-section">
                <h2>Dấu mốc &amp; kinh nghiệm</h2>
                <div className="photographer-audience">
                  {profile.milestones.map((item, i) => (
                    <article key={i}>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {!!profile.portfolio.length && (
              <section className="photographer-section">
                <h2>Một số bộ ảnh tiêu biểu</h2>
                <p className="photographer-section-intro">
                  Góc nhìn thể hiện qua ánh sáng, bố cục và biểu cảm.
                </p>
                <div className="photographer-work-grid">
                  {profile.portfolio.map((photo, i) => (
                    <figure key={`${photo.url}-${i}`}>
                      <CustomerImage
                        src={photo.url}
                        alt={photo.caption || `Tác phẩm của ${profile.name}`}
                        width={400}
                        height={230}
                      />
                    </figure>
                  ))}
                </div>
              </section>
            )}
            {pkg && startAt && (
              <footer className="photographer-booking-recap">
                <strong>Buổi chụp của bạn</strong>
                <span>{pkg.name}</span>
                <span>
                  {studioShortDateLabel(studioDay(startAt))} · {sessionTime}
                </span>
              </footer>
            )}
          </>
        )}
      </div>
    </PublicSiteLayout>
  );
}
