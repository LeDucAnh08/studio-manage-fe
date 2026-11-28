import { useEffect, useState } from 'react';
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

  const checkedAtTimeStep = Array.isArray(draft.availablePhotographers);
  const availableForSelectedSlot =
    !!startAt &&
    (!checkedAtTimeStep || draft.availablePhotographers!.some((p) => p._id === photographerId));
  const blockedAsBusy = !!startAt && checkedAtTimeStep && !availableForSelectedSlot;

  useEffect(() => {
    if (blockedAsBusy) {
      setProfile(null);
      setError('');
      return;
    }
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
  }, [photographerId, revision, blockedAsBusy]);

  const select = () => {
    if (!pkg || !startAt || !profile || !availableForSelectedSlot) return;
    writeConceptDraft({
      ...draft,
      photographerId,
      photographerName: profile.name,
      step: 3,
      key: crypto.randomUUID(),
      ...(draft.photographerId !== photographerId ? { costumes: [] } : {}),
    });
    navigate(conceptBookingPath(packageId, 'photographer'));
  };

  return (
    <PublicSiteLayout source="concepts">
      <div className="photographer-page">
        <Link className="app-back-link photographer-back" to={back}>
          <ArrowLeft size={18} aria-hidden="true" />
          {startAt ? 'Quay lại danh sách thợ' : 'Quay lại chi tiết gói'}
        </Link>
        {blockedAsBusy ? (
          <div className="photographer-notice" role="alert">
            <h1>Thợ chưa có lịch trống cho khung giờ này</h1>
            <p>Chỉ các thợ còn trống ở khung giờ đã chọn mới hiển thị portfolio để đặt lịch.</p>
            <div className="photographer-inline-actions">
              <Link to={back}>Quay lại danh sách thợ</Link>
              <Link to={conceptBookingPath(packageId)}>Chọn thời gian khác</Link>
            </div>
          </div>
        ) : (
          <>
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
                        disabled={!pkg || !availableForSelectedSlot || !!error}
                        onClick={select}
                      >
                        <Check size={20} aria-hidden="true" />
                        {`Chọn ${profile.name}`}
                      </button>
                      {startAt && (
                        <p>
                          Cho buổi chụp {studioShortDateLabel(studioDay(startAt))} · {sessionTime}
                        </p>
                      )}
                      {!startAt && (
                        <>
                          <p>Chọn thời gian trước để tiếp tục đặt lịch.</p>
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
                          </div>
                        </>
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
          </>
        )}
      </div>
    </PublicSiteLayout>
  );
}
