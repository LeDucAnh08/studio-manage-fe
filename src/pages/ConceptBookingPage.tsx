import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { useAuth } from '../context/AuthContext';
import {
  Catalog,
  Slot,
  conceptError,
  conceptService,
  money,
  vnTime,
} from '../services/conceptService';
import '../styles/concept.css';
import ConceptTimePicker from './ConceptTimePicker';
import { CustomerImage } from '../components/customer/CustomerImage';
import '../styles/concept-photographer.css';
import {
  studioDay,
  addCalendarDays as addDay,
  calendarMonth,
  calendarDays,
} from '../services/conceptCalendar';

import {
  CONCEPT_DRAFT_KEY,
  conceptBookingPath,
  conceptPhotographerPath,
  conceptScreens,
  readConceptDraft as readDraft,
  writeConceptDraft,
  validWardrobeMeasurements,
  type ConceptDraft as Draft,
} from '../services/conceptDraft';
export { CONCEPT_DRAFT_KEY } from '../services/conceptDraft';
const today = () => studioDay();
export default function ConceptBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { packageId, screen } = useParams();
  const screenIndex = conceptScreens.indexOf(screen as (typeof conceptScreens)[number]);
  const step = screenIndex < 0 ? 2 : screenIndex + 2;
  const [draft, setDraft] = useState<Draft>(() => {
    const passed = location.state?.conceptDraft as Draft | undefined;
    return passed?.ownerId === (user?._id || null)
      ? {
          ...readDraft(user?._id || null),
          ...passed,
          wardrobeMeasurements: Array.isArray(passed.wardrobeMeasurements)
            ? passed.wardrobeMeasurements
            : [],
        }
      : readDraft(user?._id || null);
  });
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(() =>
      Number.isFinite(Date.parse(draft.startAt))
        ? [calendarMonth(studioDay(draft.startAt)), calendarMonth(today())].sort()[1]
        : calendarMonth(today()),
    ),
    [days, setDays] = useState<Record<string, Slot[]>>({}),
    [day, setDay] = useState(() =>
      Number.isFinite(Date.parse(draft.startAt)) ? studioDay(draft.startAt) : today(),
    ),
    [loadingDays, setLoadingDays] = useState(false),
    [availabilityError, setAvailabilityError] = useState(''),
    [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const loadedMonths = useRef<Record<string, number>>({});
  const pkg = catalog?.packages.find((p) => p._id === draft.packageId);
  const slot = Object.values(days)
    .flat()
    .find((s) => s.startAt === draft.startAt);
  const availabilityDay =
    step === 2 || !Number.isFinite(Date.parse(draft.startAt)) ? '' : studioDay(draft.startAt);
  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch, key: crypto.randomUUID() }));
    setAccepted(false);
    setError('');
  };
  useEffect(() => {
    const abort = new AbortController();
    conceptService
      .catalog(abort.signal)
      .then(setCatalog)
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    setDraft((current) =>
      current.ownerId === (user?._id || null) ? current : readDraft(user?._id || null),
    );
  }, [user?._id]);
  useEffect(() => {
    writeConceptDraft({ ...draft, step });
  }, [draft, step]);
  useEffect(() => {
    if (!pkg) return;
    const cacheKey = pkg._id + ':' + month;
    if (
      step === 2 &&
      loadedMonths.current[cacheKey] &&
      Date.now() - loadedMonths.current[cacheKey] < 30000
    ) {
      setLoadingDays(false);
      setAvailabilityError('');
      return;
    }
    const abort = new AbortController();
    setLoadingDays(true);
    setAvailabilityError('');
    const pending =
      step === 2
        ? calendarDays(month).filter(
            (date) =>
              date >= today() && date <= addDay(today(), catalog?.settings.horizonDays || 90),
          )
        : availabilityDay
          ? [availabilityDay]
          : [];
    const results: Record<string, Slot[]> = {};
    // Bound concurrent requests to the existing per-day availability endpoint.
    Promise.all(
      Array.from({ length: Math.min(4, pending.length) }, async () => {
        while (pending.length && !abort.signal.aborted) {
          const date = pending.shift()!;
          results[date] = (
            await conceptService.availability(pkg._id, date, abort.signal)
          ).slots.filter((candidate) => Date.parse(candidate.startAt) > Date.now());
        }
      }),
    )
      .then(() => {
        if (!abort.signal.aborted) {
          setDays((current) => ({ ...current, ...results }));
          if (step === 2) loadedMonths.current[cacheKey] = Date.now();
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setAvailabilityError(conceptError(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingDays(false);
      });
    return () => abort.abort();
  }, [pkg, month, step, availabilityDay, availabilityRetry, catalog?.settings.horizonDays]);
  const next = () => {
    if (step === 2 && draft.startAt && Date.parse(draft.startAt) <= Date.now()) {
      setError('Khung giờ đã qua. Vui lòng chọn khung giờ khác.');
      loadedMonths.current = {};
      setAvailabilityRetry((value) => value + 1);
      return;
    }
    if (
      !pkg ||
      (step === 2 && (!slot || loadingDays || !!availabilityError)) ||
      (step === 3 && !slot?.photographers.some((p) => p._id === draft.photographerId))
    ) {
      setError('Hoàn tất lựa chọn trước khi tiếp tục.');
      return;
    }
    if (
      step === 4 &&
      pkg.costumeCount > 0 &&
      !validWardrobeMeasurements(draft.wardrobeMeasurements, draft.people)
    ) {
      setError('Điền size, chiều cao và cân nặng cho từng người.');
      return;
    }
    if (
      step === 5 &&
      (!draft.contactName.trim() ||
        !/^(?:0\d{9}|\+84\d{9})$/.test(draft.phone) ||
        draft.people < 1 ||
        draft.people > pkg.maxPeople)
    ) {
      setError('Kiểm tra họ tên, số điện thoại và số người.');
      return;
    }
    const nextStep = Math.min(6, step + 1);
    update({ step: nextStep });
    navigate(conceptBookingPath(draft.packageId, conceptScreens[nextStep - 2]));
  };
  const submit = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (!user.emailVerifiedAt || !pkg || !accepted) return;
    setBusy(true);
    setError('');
    try {
      const order = await conceptService.checkout(
        {
          packageId: pkg._id,
          packageVersion: pkg.version,
          startAt: draft.startAt,
          photographerId: draft.photographerId,
          costumes: [],
          wardrobeMeasurements: pkg.costumeCount > 0 ? draft.wardrobeMeasurements : [],
          contactName: draft.contactName,
          phone: draft.phone,
          people: draft.people,
          brief: draft.brief,
          references: draft.referencesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          accepted,
        },
        draft.key,
      );
      sessionStorage.removeItem(CONCEPT_DRAFT_KEY);
      navigate(`/account/concept-orders/${order._id}`);
    } catch (e) {
      setError(conceptError(e));
    } finally {
      setBusy(false);
    }
  };
  if (catalog && (!pkg || !packageId || draft.packageId !== packageId || screenIndex < 0))
    return (
      <Navigate
        to={packageId ? `/concept-booking/packages/${packageId}` : '/concept-booking'}
        replace
      />
    );
  if (catalog && step > 2 && !draft.startAt)
    return <Navigate to={conceptBookingPath(draft.packageId)} replace />;
  if (catalog && step > 3 && !draft.photographerId)
    return <Navigate to={conceptBookingPath(draft.packageId, 'photographer')} replace />;
  if (
    pkg &&
    step > 4 &&
    pkg.costumeCount > 0 &&
    !validWardrobeMeasurements(draft.wardrobeMeasurements, draft.people)
  )
    return <Navigate to={conceptBookingPath(draft.packageId, 'costumes')} replace />;
  return (
    <PublicSiteLayout source="concepts">
      <div className={step === 2 ? 'concept-time-page' : 'concept-workspace concept-booking-flow'}>
        {step !== 2 && (
          <header>
            <Link
              className="app-back-link concept-wizard-back"
              to={conceptBookingPath(draft.packageId, conceptScreens[step - 3])}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              {
                (
                  {
                    3: 'Quay lại chọn thời gian',
                    4: 'Quay lại chọn thợ',
                    5: 'Quay lại thông tin trang phục',
                    6: 'Quay lại thông tin buổi chụp',
                  } as Record<number, string>
                )[step]
              }
            </Link>
            <h1>{step === 3 ? 'Chọn thợ chụp' : 'Buổi chụp của bạn'}</h1>
            {pkg && (
              <p>
                {pkg.name} · {pkg.durationMinutes} phút
              </p>
            )}
          </header>
        )}
        {error && (
          <p role="alert" className="concept-error">
            {error}
          </p>
        )}
        {!catalog && !error && <p role="status">Đang tải gói chụp…</p>}
        {step === 2 && pkg && (
          <ConceptTimePicker
            pkg={pkg}
            image={pkg.imageUrl || catalog?.concepts.find((c) => c._id === pkg.concept)?.coverUrl}
            month={month}
            firstDay={today()}
            lastDay={addDay(today(), catalog?.settings.horizonDays || 90)}
            day={day}
            days={days}
            loading={loadingDays}
            error={availabilityError}
            selected={slot}
            selectionUnavailable={!!draft.startAt && !slot && !loadingDays && !availabilityError}
            onMonth={setMonth}
            onDay={(value) => {
              setDay(value);
              if (!Number.isFinite(Date.parse(draft.startAt)) || studioDay(draft.startAt) !== value)
                update({ startAt: '', photographerId: '', costumes: [] });
            }}
            onSlot={(startAt) => update({ startAt, photographerId: '', costumes: [] })}
            onRetry={() => {
              loadedMonths.current = {};
              setAvailabilityRetry((value) => value + 1);
            }}
            onNext={next}
          />
        )}
        {step === 3 && (
          <section className="photographer-selection">
            <p>Xem hồ sơ và phong cách riêng để chọn người đồng hành cùng bạn.</p>
            {draft.startAt && <p>{vnTime(draft.startAt)}</p>}
            {loadingDays && <p role="status">Đang tìm thợ có thể nhận lịch…</p>}
            {availabilityError && <p role="alert">{availabilityError}</p>}
            {!loadingDays && !slot && (
              <p>Khung giờ này không còn trống. Bạn vui lòng quay lại chọn thời gian.</p>
            )}
            <div className="photographer-selection-grid">
              {slot?.photographers.map((p) => (
                <article
                  className="photographer-selection-card"
                  key={p._id}
                  data-selected={draft.photographerId === p._id}
                >
                  <div className="photographer-card-identity">
                    {p.portraitUrl && (
                      <CustomerImage
                        src={p.portraitUrl}
                        alt={`Chân dung ${p.name}`}
                        width={108}
                        height={135}
                      />
                    )}
                    <div>
                      <h3>{p.name}</h3>
                      {p.title && <p className="photographer-card-title">{p.title}</p>}
                      <p>{p.tagline || p.bio}</p>
                    </div>
                  </div>
                  {p.coverUrl && (
                    <CustomerImage
                      className="photographer-card-cover"
                      src={p.coverUrl}
                      alt={`Phong cách ảnh của ${p.name}`}
                      width={560}
                      height={160}
                    />
                  )}
                  <div className="photographer-card-actions">
                    <Link to={conceptPhotographerPath(draft.packageId, p._id)}>
                      Xem hồ sơ {p.name}
                    </Link>
                    {draft.photographerId === p._id && (
                      <span className="photographer-card-selected">Đã chọn</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {step === 4 && pkg && (
          <section className="concept-measurements">
            <h2>Thông tin trang phục</h2>
            {pkg.costumeCount > 0 ? (
              <>
                <p>
                  Gói đã bao gồm tối đa {pkg.costumeCount} bộ trang phục. Studio sẽ chuẩn bị theo
                  concept và số đo của bạn.
                </p>
                {pkg.maxPeople > 1 && (
                  <label>
                    Số người tham gia
                    <select
                      value={draft.people}
                      onChange={(e) => {
                        const people = Number(e.target.value);
                        update({
                          people,
                          wardrobeMeasurements: Array.from(
                            { length: people },
                            (_, i) =>
                              draft.wardrobeMeasurements?.[i] || {
                                size: '',
                                heightCm: 0,
                                weightKg: 0,
                              },
                          ),
                        });
                      }}
                    >
                      {Array.from({ length: pkg.maxPeople }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} người
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {Array.from({ length: draft.people }, (_, index) => {
                  const row = draft.wardrobeMeasurements?.[index] || {
                    size: '',
                    heightCm: 0,
                    weightKg: 0,
                  };
                  const change = (patch: Partial<typeof row>) =>
                    update({
                      wardrobeMeasurements: Array.from({ length: draft.people }, (_, i) => ({
                        ...(draft.wardrobeMeasurements?.[i] || {
                          size: '',
                          heightCm: 0,
                          weightKg: 0,
                        }),
                        ...(i === index ? patch : {}),
                      })),
                    });
                  return (
                    <fieldset className="concept-measurement-card" key={index}>
                      <legend>Người {index + 1}</legend>
                      <div className="concept-form-grid">
                        <label>
                          Size thường mặc
                          <input
                            aria-label={`Size người ${index + 1}`}
                            maxLength={12}
                            placeholder="Ví dụ: M, L, XL"
                            value={row.size}
                            onChange={(e) => change({ size: e.target.value })}
                          />
                        </label>
                        <label>
                          Chiều cao (cm)
                          <input
                            aria-label={`Chiều cao người ${index + 1}`}
                            type="number"
                            min={30}
                            max={250}
                            step="0.1"
                            inputMode="decimal"
                            placeholder="Ví dụ: 165"
                            value={row.heightCm || ''}
                            onChange={(e) => change({ heightCm: Number(e.target.value) })}
                          />
                        </label>
                        <label>
                          Cân nặng (kg)
                          <input
                            aria-label={`Cân nặng người ${index + 1}`}
                            type="number"
                            min={1}
                            max={350}
                            step="0.1"
                            inputMode="decimal"
                            placeholder="Ví dụ: 55"
                            value={row.weightKg || ''}
                            onChange={(e) => change({ weightKg: Number(e.target.value) })}
                          />
                        </label>
                      </div>
                    </fieldset>
                  );
                })}
              </>
            ) : (
              <p>Gói sử dụng trang phục cá nhân. Bạn chuẩn bị theo gợi ý trong chi tiết gói.</p>
            )}
          </section>
        )}
        {step === 5 && pkg && (
          <section>
            <h2>Brief cho buổi chụp</h2>
            <div className="concept-form-grid">
              <label>
                Họ tên liên hệ
                <input
                  value={draft.contactName}
                  maxLength={100}
                  onChange={(e) => update({ contactName: e.target.value })}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                />
              </label>
              {pkg.costumeCount === 0 && (
                <label>
                  Số người
                  <input
                    type="number"
                    min="1"
                    max={pkg.maxPeople}
                    value={draft.people}
                    onChange={(e) => update({ people: Number(e.target.value) })}
                  />
                </label>
              )}
              {pkg.costumeCount > 0 && <p>Số người tham gia: {draft.people}</p>}
            </div>
            <label>
              Ý tưởng và yêu cầu
              <textarea
                maxLength={4000}
                value={draft.brief}
                onChange={(e) => update({ brief: e.target.value })}
              />
            </label>
            <label>
              Link ảnh mẫu (mỗi dòng một link HTTPS)
              <textarea
                value={draft.referencesText}
                onChange={(e) => update({ referencesText: e.target.value })}
              />
            </label>
          </section>
        )}
        {step === 6 && pkg && (
          <section className="concept-card">
            <h2>Kiểm tra trước khi đặt cọc</h2>
            <h3>{pkg.name}</h3>
            <p>
              {vnTime(draft.startAt)} · {pkg.durationMinutes} phút · {draft.people} người
            </p>
            <p>
              {draft.contactName} · {draft.phone}
            </p>
            {pkg.costumeCount > 0 && (
              <section>
                <h3>Thông tin trang phục</h3>
                <ul>
                  {draft.wardrobeMeasurements.map((row, i) => (
                    <li key={i}>
                      Người {i + 1} · Size {row.size} · {row.heightCm} cm · {row.weightKg} kg
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p>{draft.brief}</p>
            <p>
              Giá hợp đồng: <strong>{money(pkg.price)}</strong> · Cọc 30%:{' '}
              <strong>{money(Math.ceil(pkg.price * 0.3))}</strong>
            </p>
            <p>Giữ chỗ 15 phút từ lúc tạo QR. Lịch xác nhận khi hệ thống nhận đủ cọc trong hạn.</p>
            <p>
              Một lần đổi lịch miễn phí trước 48 giờ. Hủy trước ≥48 giờ hoàn cọc; 24–48 giờ giữ nửa
              cọc; dưới 24 giờ giữ toàn bộ cọc. Hai vòng feedback miễn phí; ảnh thêm{' '}
              {money(pkg.extraPhotoPrice)}/ảnh.
            </p>
            {!user ? (
              <button onClick={() => void submit()}>Đăng nhập để tiếp tục</button>
            ) : !user.emailVerifiedAt ? (
              <p>
                Xác thực email trước khi đặt cọc.{' '}
                <Link to="/account/profile">Cập nhật và xác thực email</Link>. Thông tin buổi chụp
                đã được lưu.
              </p>
            ) : (
              <>
                <label className="concept-check">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  Tôi đồng ý giá gói, tiền cọc, phí ảnh thêm và chính sách đổi/hủy.
                </label>
                <button disabled={!accepted || busy} onClick={() => void submit()}>
                  {busy ? 'Đang kiểm tra và giữ chỗ…' : 'Tạo QR cọc 30%'}
                </button>
              </>
            )}
          </section>
        )}
        {step > 2 && step < 6 && (
          <footer className="concept-actions">
            {step < 6 && (
              <button
                disabled={
                  step === 3 && !slot?.photographers.some((p) => p._id === draft.photographerId)
                }
                onClick={next}
              >
                Tiếp tục
              </button>
            )}
          </footer>
        )}
      </div>
    </PublicSiteLayout>
  );
}
