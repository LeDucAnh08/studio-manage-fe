import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import PhotographerPortfolio from '../components/PhotographerPortfolio';
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
            <PhotographerPortfolio
              profile={profile}
              actions={
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
              }
            />
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
