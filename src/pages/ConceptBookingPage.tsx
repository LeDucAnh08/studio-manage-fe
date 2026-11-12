import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Coins, UserRound } from 'lucide-react';
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
import '../styles/concept-preparation.css';
import '../styles/concept-review.css';
import {
  studioDay,
  addCalendarDays as addDay,
  calendarMonth,
  calendarDays,
  studioShortDateLabel,
  studioTime,
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
  const screenIndex = conceptScreens.indexOf(
    (screen === 'brief' ? 'costumes' : screen) as (typeof conceptScreens)[number],
  );
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
  const photographer = slot?.photographers.find((p) => p._id === draft.photographerId);
  const packageImage =
    pkg?.imageUrl || catalog?.concepts.find((c) => c._id === pkg?.concept)?.coverUrl;
  const validContact =
    !!draft.contactName.trim() &&
    /^(?:0\d{9}|\+84\d{9})$/.test(draft.phone) &&
    Number.isInteger(draft.people) &&
    draft.people >= 1 &&
    draft.people <= (pkg?.maxPeople || 1);
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
    if (pkg?.maxPeople !== 1) return;
    setDraft((current) =>
      current.people === 1
        ? current
        : {
            ...current,
            people: 1,
            wardrobeMeasurements: current.wardrobeMeasurements.slice(0, 1),
            key: crypto.randomUUID(),
          },
    );
  }, [pkg?.maxPeople]);
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
    if (step === 4 && !validContact) {
      setError('Kiểm tra họ tên, số điện thoại và số người.');
      return;
    }
    const nextStep = Math.min(5, step + 1);
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
      navigate(`/account/concept-orders/${order._id}?payment=deposit`, {
        state: { conceptDraft: draft },
      });
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
  if (screen === 'brief')
    return <Navigate to={conceptBookingPath(packageId || draft.packageId, 'costumes')} replace />;
  if (catalog && step > 2 && !Number.isFinite(Date.parse(draft.startAt)))
    return <Navigate to={conceptBookingPath(draft.packageId)} replace />;
  if (catalog && step > 3 && !draft.photographerId)
    return <Navigate to={conceptBookingPath(draft.packageId, 'photographer')} replace />;
  if (
    pkg &&
    step > 4 &&
    (!validContact ||
      (pkg.costumeCount > 0 &&
        !validWardrobeMeasurements(draft.wardrobeMeasurements, draft.people)))
  )
    return <Navigate to={conceptBookingPath(draft.packageId, 'costumes')} replace />;
  return (
    <PublicSiteLayout source="concepts">
      <div
        className={
          step === 2
            ? 'concept-time-page'
            : `concept-workspace concept-booking-flow${step === 4 ? ' concept-preparation-page' : ''}${step === 5 ? ' concept-review-page' : ''}`
        }
      >
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
                    5: 'Quay lại thông tin buổi chụp',
                  } as Record<number, string>
                )[step]
              }
            </Link>
            <h1>
              {step === 3
                ? 'Chọn thợ chụp'
                : step === 4
                  ? 'Thông tin buổi chụp'
                  : 'Kiểm tra trước khi đặt cọc'}
            </h1>
            {step === 5 ? (
              <p>Xem lại thông tin buổi chụp trước khi chuyển sang thanh toán cọc.</p>
            ) : step === 4 ? (
              <p>Một vài thông tin để studio chuẩn bị buổi chụp phù hợp với bạn.</p>
            ) : (
              pkg && (
                <p>
                  {pkg.name} · {pkg.durationMinutes} phút
                </p>
              )
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
          <form
            className="concept-preparation"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              next();
            }}
          >
            <div className="concept-preparation-layout">
              <div className="concept-preparation-fields">
                <section aria-labelledby="preparation-contact">
                  <h2 id="preparation-contact">Thông tin liên hệ</h2>
                  <div className="concept-preparation-contact">
                    <label>
                      Họ tên liên hệ
                      <input
                        autoComplete="name"
                        maxLength={100}
                        value={draft.contactName}
                        onChange={(e) => update({ contactName: e.target.value })}
                      />
                    </label>
                    <label>
                      Số điện thoại
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={draft.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                      />
                    </label>
                  </div>
                </section>
                <section aria-labelledby="preparation-wardrobe">
                  <h2 id="preparation-wardrobe">Trang phục</h2>
                  <p>
                    {pkg.costumeCount > 0
                      ? `Gói đã bao gồm tối đa ${pkg.costumeCount} bộ trang phục. Studio chuẩn bị theo concept và số đo của bạn.`
                      : 'Gói sử dụng trang phục cá nhân. Bạn chuẩn bị theo gợi ý trong chi tiết gói.'}
                  </p>
                  {pkg.maxPeople === 1 ? (
                    <p className="concept-preparation-fixed-people">
                      Số người tham gia <strong>1 người</strong>
                    </p>
                  ) : (
                    <label className="concept-preparation-people">
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
                                draft.wardrobeMeasurements[i] || {
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
                  {pkg.costumeCount > 0 &&
                    Array.from({ length: draft.people }, (_, index) => {
                      const row = draft.wardrobeMeasurements[index] || {
                        size: '',
                        heightCm: 0,
                        weightKg: 0,
                      };
                      const change = (patch: Partial<typeof row>) =>
                        update({
                          wardrobeMeasurements: Array.from({ length: draft.people }, (_, i) => ({
                            ...(draft.wardrobeMeasurements[i] || {
                              size: '',
                              heightCm: 0,
                              weightKg: 0,
                            }),
                            ...(i === index ? patch : {}),
                          })),
                        });
                      return (
                        <fieldset className="concept-preparation-person" key={index}>
                          <legend>Người {index + 1}</legend>
                          <div className="concept-preparation-measurements">
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
                </section>
                <section aria-labelledby="preparation-ideas">
                  <h2 id="preparation-ideas">Mong muốn cho buổi chụp</h2>
                  <label>
                    Ý tưởng và yêu cầu
                    <textarea
                      maxLength={4000}
                      placeholder="Chia sẻ phong cách, cảm xúc hoặc điều bạn muốn lưu lại trong bộ ảnh..."
                      value={draft.brief}
                      onChange={(e) => update({ brief: e.target.value })}
                    />
                  </label>
                  <label>
                    Link ảnh mẫu
                    <span className="concept-preparation-hint">Mỗi dòng một link HTTPS.</span>
                    <textarea
                      className="concept-preparation-references"
                      rows={1}
                      placeholder="Ví dụ: https://..."
                      value={draft.referencesText}
                      onChange={(e) => update({ referencesText: e.target.value })}
                    />
                  </label>
                </section>
              </div>
              <aside className="concept-preparation-summary" aria-labelledby="preparation-summary">
                <h2 id="preparation-summary">Thông tin đặt chụp</h2>
                {packageImage && (
                  <CustomerImage
                    src={packageImage}
                    alt={pkg.name}
                    width={640}
                    height={336}
                    priority
                  />
                )}
                <h3>{pkg.name}</h3>
                <p>
                  {pkg.durationMinutes} phút · {pkg.retouchQuota} ảnh chỉnh sửa
                </p>
                <dl>
                  <div>
                    <dt>
                      <CalendarDays size={20} aria-hidden="true" />
                      <span className="sr-only">Ngày chụp</span>
                    </dt>
                    <dd>{studioShortDateLabel(studioDay(draft.startAt))}</dd>
                  </div>
                  <div>
                    <dt>
                      <Clock3 size={20} aria-hidden="true" />
                      <span className="sr-only">Giờ chụp</span>
                    </dt>
                    <dd>
                      {studioTime(draft.startAt)}–
                      {studioTime(
                        new Date(
                          Date.parse(draft.startAt) + pkg.durationMinutes * 60000,
                        ).toISOString(),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <UserRound size={20} aria-hidden="true" />
                      <span className="sr-only">Thợ chụp</span>
                    </dt>
                    <dd>
                      {photographer?.name ||
                        (loadingDays ? 'Đang kiểm tra lịch…' : 'Chưa tải được thông tin thợ')}
                      {!photographer && !loadingDays && (
                        <Link to={conceptBookingPath(draft.packageId, 'photographer')}>
                          Kiểm tra lại lịch
                        </Link>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Coins size={20} aria-hidden="true" />
                      <span className="sr-only">Giá gói</span>
                    </dt>
                    <dd>
                      <strong>{money(pkg.price)}</strong>
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
            <footer className="concept-preparation-footer">
              <div>
                <button type="submit">
                  Tiếp tục <ArrowRight size={19} aria-hidden="true" />
                </button>
                <p>Tiếp theo: kiểm tra &amp; đặt cọc</p>
              </div>
            </footer>
          </form>
        )}
        {step === 5 && pkg && (
          <section className="concept-review">
            <ol className="concept-checkout-progress" aria-label="Tiến trình đặt cọc">
              <li aria-current="step">
                <span>1</span> Kiểm tra thông tin
              </li>
              <li>
                <span>2</span> Thanh toán cọc
              </li>
            </ol>
            <div className="concept-review-layout">
              <div className="concept-review-details">
                <section className="concept-review-block">
                  <h2>Buổi chụp của bạn</h2>
                  <dl className="concept-review-facts">
                    <div>
                      <dt>Gói chụp</dt>
                      <dd>{pkg.name}</dd>
                    </div>
                    <div>
                      <dt>Thời gian</dt>
                      <dd>
                        {vnTime(draft.startAt)} · {pkg.durationMinutes} phút
                      </dd>
                    </div>
                    <div>
                      <dt>Thợ chụp</dt>
                      <dd>
                        {photographer?.name ||
                          (loadingDays ? 'Đang tải…' : 'Chưa tải được thông tin thợ')}
                      </dd>
                    </div>
                    <div>
                      <dt>Số người</dt>
                      <dd>{draft.people} người</dd>
                    </div>
                  </dl>
                </section>
                <section className="concept-review-block">
                  <h2>Thông tin liên hệ</h2>
                  <dl className="concept-review-facts">
                    <div>
                      <dt>Họ tên</dt>
                      <dd>{draft.contactName}</dd>
                    </div>
                    <div>
                      <dt>Số điện thoại</dt>
                      <dd>{draft.phone}</dd>
                    </div>
                  </dl>
                </section>
                {pkg.costumeCount > 0 && (
                  <section className="concept-review-block">
                    <h2>Thông tin trang phục</h2>
                    <ul>
                      {draft.wardrobeMeasurements.map((row, i) => (
                        <li key={i}>
                          Người {i + 1} · Size {row.size} · {row.heightCm} cm · {row.weightKg} kg
                        </li>
                      ))}
                    </ul>
                    <p className="concept-review-muted">
                      Studio chuẩn bị trang phục theo số đo bạn đã cung cấp.
                    </p>
                  </section>
                )}
                <section className="concept-review-block">
                  <h2>Ý tưởng buổi chụp</h2>
                  <p className="concept-review-brief">{draft.brief || 'Chưa có yêu cầu riêng.'}</p>
                  {draft.referencesText
                    .split('\n')
                    .map((url) => url.trim())
                    .filter(Boolean)
                    .map((url, i) => (
                      <p key={i}>
                        <a
                          href={/^https?:\/\//i.test(url) ? url : undefined}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {url}
                        </a>
                      </p>
                    ))}
                </section>
                <section className="concept-review-block concept-review-policy">
                  <h2>Chính sách đặt lịch</h2>
                  <p>
                    Một lần đổi lịch miễn phí trước 48 giờ. Hủy trước ≥48 giờ hoàn cọc; 24–48 giờ
                    giữ nửa cọc; dưới 24 giờ giữ toàn bộ cọc. Hai vòng feedback miễn phí; ảnh thêm{' '}
                    {money(pkg.extraPhotoPrice)}/ảnh.
                  </p>
                </section>
              </div>
              <aside className="concept-review-summary" aria-label="Chi phí buổi chụp">
                {packageImage && (
                  <CustomerImage src={packageImage} alt={pkg.name} width={640} height={360} />
                )}
                <div className="concept-review-summary-body">
                  <p className="concept-eyebrow">CHI PHÍ BUỔI CHỤP</p>
                  <h2>{pkg.name}</h2>
                  <dl>
                    <div>
                      <dt>Giá gói</dt>
                      <dd>{money(pkg.price)}</dd>
                    </div>
                    <div className="concept-review-deposit">
                      <dt>
                        Đặt cọc hôm nay <small>30% giá gói</small>
                      </dt>
                      <dd>{money(Math.ceil(pkg.price * 0.3))}</dd>
                    </div>
                    <div>
                      <dt>Còn lại sau cọc</dt>
                      <dd>{money(pkg.price - Math.ceil(pkg.price * 0.3))}</dd>
                    </div>
                  </dl>
                  <p className="concept-review-muted">
                    Ở bước tiếp theo, bạn có 15 phút để thanh toán cọc và xác nhận lịch chụp.
                  </p>
                  {!user ? (
                    <button onClick={() => void submit()}>Đăng nhập để tiếp tục</button>
                  ) : !user.emailVerifiedAt ? (
                    <p>
                      Xác thực email trước khi đặt cọc.{' '}
                      <Link to="/account/profile">Cập nhật và xác thực email</Link>. Thông tin buổi
                      chụp đã được lưu.
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
                      <button
                        className="concept-checkout-next"
                        disabled={!accepted || busy}
                        onClick={() => void submit()}
                      >
                        {busy ? 'Đang chuyển đến thanh toán…' : 'Tiếp theo'}
                        <ArrowRight size={19} aria-hidden="true" />
                      </button>
                      <p className="concept-review-next-hint">Tiếp theo: thanh toán cọc</p>
                    </>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
        {step === 3 && (
          <footer className="concept-actions">
            <button
              disabled={!slot?.photographers.some((p) => p._id === draft.photographerId)}
              onClick={next}
            >
              Tiếp tục
            </button>
          </footer>
        )}
      </div>
    </PublicSiteLayout>
  );
}
