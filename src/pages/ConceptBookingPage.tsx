import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { useAuth } from '../context/AuthContext';
import {
  Catalog,
  ConceptPackage,
  CostumeChoice,
  CostumeOption,
  Slot,
  conceptError,
  conceptService,
  money,
  vnTime,
} from '../services/conceptService';
import '../styles/concept.css';

export const CONCEPT_DRAFT_KEY = 'yume-concept-draft-v1';
interface Draft {
  ownerId: string | null;
  packageId: string;
  startAt: string;
  photographerId: string;
  costumes: CostumeChoice[];
  contactName: string;
  phone: string;
  people: number;
  brief: string;
  referencesText: string;
  step: number;
  key: string;
}
const emptyDraft = (ownerId: string | null): Draft => ({
  ownerId,
  packageId: '',
  startAt: '',
  photographerId: '',
  costumes: [],
  contactName: '',
  phone: '',
  people: 1,
  brief: '',
  referencesText: '',
  step: 1,
  key: crypto.randomUUID(),
});
function readDraft(ownerId: string | null): Draft {
  try {
    const d = JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || 'null');
    if (
      d &&
      (d.ownerId === ownerId || !d.ownerId) &&
      typeof d.packageId === 'string' &&
      Array.isArray(d.costumes) &&
      Number.isInteger(d.step) &&
      d.step >= 1 &&
      d.step <= 6
    )
      return { ...emptyDraft(ownerId), ...d, ownerId };
  } catch {
    /* Start a clean draft if storage is unavailable or corrupt. */
  }
  return emptyDraft(ownerId);
}
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const addDay = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export default function ConceptBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => readDraft(user?._id || null));
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [week, setWeek] = useState(today),
    [days, setDays] = useState<Record<string, Slot[]>>({}),
    [day, setDay] = useState(''),
    [loadingDays, setLoadingDays] = useState(false);
  const [costumes, setCostumes] = useState<CostumeOption[]>([]),
    [accepted, setAccepted] = useState(false);
  const [concept, setConcept] = useState('');
  const pkg = catalog?.packages.find((p) => p._id === draft.packageId);
  const slot = Object.values(days)
    .flat()
    .find((s) => s.startAt === draft.startAt);
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
    try {
      sessionStorage.setItem(CONCEPT_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* Checkout still works without storage. */
    }
  }, [draft]);
  useEffect(() => {
    if (!pkg) return;
    const abort = new AbortController();
    setLoadingDays(true);
    setDays({});
    Promise.all(
      Array.from({ length: 7 }, (_, i) => addDay(week, i)).map(
        async (d) =>
          [d, (await conceptService.availability(pkg._id, d, abort.signal)).slots] as const,
      ),
    )
      .then((results) => {
        if (!abort.signal.aborted) setDays(Object.fromEntries(results));
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingDays(false);
      });
    return () => abort.abort();
  }, [pkg, week]);
  useEffect(() => {
    if (!draft.startAt || !pkg) return;
    const abort = new AbortController();
    conceptService
      .costumes(pkg._id, draft.startAt, abort.signal)
      .then(setCostumes)
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      });
    return () => abort.abort();
  }, [pkg, draft.startAt]);
  const choosePackage = (p: ConceptPackage) =>
    update({ packageId: p._id, startAt: '', photographerId: '', costumes: [], step: 2 });
  const next = () => {
    if (
      !pkg ||
      (draft.step === 2 && !draft.startAt) ||
      (draft.step === 3 && !draft.photographerId)
    ) {
      setError('Hoàn tất lựa chọn trước khi tiếp tục.');
      return;
    }
    if (draft.step === 4 && draft.costumes.reduce((s, c) => s + c.quantity, 0) > pkg.costumeCount) {
      setError('Vượt số bộ trang phục của gói.');
      return;
    }
    if (
      draft.step === 5 &&
      (!draft.contactName.trim() ||
        !/^(?:0\d{9}|\+84\d{9})$/.test(draft.phone) ||
        draft.people < 1 ||
        draft.people > pkg.maxPeople)
    ) {
      setError('Kiểm tra họ tên, số điện thoại và số người.');
      return;
    }
    update({ step: Math.min(6, draft.step + 1) });
  };
  const submit = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/concept-booking' } });
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
          costumes: draft.costumes.map(({ costumeId, size, quantity }) => ({
            costumeId,
            size,
            quantity,
          })),
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
  return (
    <PublicSiteLayout source="concepts">
      <div className="concept-workspace">
        <header>
          <p className="concept-eyebrow">Yume Studio · Chụp concept</p>
          <h1>Buổi chụp dành riêng cho bạn</h1>
          <p>Chọn concept, ekip và khung giờ phù hợp. Mỗi lần chụp có album riêng.</p>
          <Link to="/account/orders?tab=concepts">Đơn concept của tôi</Link>
        </header>
        <ol className="concept-steps" aria-label="Các bước đặt chụp">
          {['Concept & gói', 'Ngày giờ', 'Thợ chụp', 'Trang phục', 'Yêu cầu', 'Kiểm tra'].map(
            (label, i) => (
              <li key={label} aria-current={draft.step === i + 1 ? 'step' : undefined}>
                {i + 1}. {label}
              </li>
            ),
          )}
        </ol>
        {error && (
          <p role="alert" className="concept-error">
            {error}
          </p>
        )}
        {!catalog && !error && <p role="status">Đang tải gói chụp…</p>}
        {draft.step === 1 && catalog && (
          <section>
            <h2>Chọn concept và gói chụp</h2>
            {!catalog.concepts.length && (
              <p>Studio đang chuẩn bị các gói concept. Vui lòng quay lại sau.</p>
            )}
            <div className="concept-tabs">
              <button onClick={() => setConcept('')}>Tất cả</button>
              {catalog.concepts.map((c) => (
                <button
                  aria-pressed={concept === c._id}
                  key={c._id}
                  onClick={() => setConcept(c._id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="concept-grid">
              {catalog.packages
                .filter((p) => !concept || p.concept === concept)
                .map((p) => {
                  const c = catalog.concepts.find((c) => c._id === p.concept);
                  return (
                    <article className="concept-card" key={p._id}>
                      {c?.coverUrl && <img src={c.coverUrl} alt={c.name} loading="lazy" />}
                      <p className="concept-eyebrow">{c?.name}</p>
                      <h3>{p.name}</h3>
                      <p>{c?.description}</p>
                      <strong>{money(p.price)} / buổi</strong>
                      <p>
                        {p.durationMinutes} phút · tối đa {p.maxPeople} người
                      </p>
                      <p>
                        {p.retouchQuota} ảnh retouch · {p.costumeCount} bộ trang phục
                      </p>
                      <p>Ảnh thêm: {money(p.extraPhotoPrice)}/ảnh</p>
                      <button onClick={() => choosePackage(p)}>Chọn {p.name}</button>
                    </article>
                  );
                })}
            </div>
          </section>
        )}
        {draft.step === 2 && pkg && (
          <section>
            <h2>Chọn ngày và khung giờ</h2>
            <p>
              {pkg.name} · {pkg.durationMinutes} phút
            </p>
            <div className="concept-actions">
              <button disabled={week <= today()} onClick={() => setWeek(addDay(week, -7))}>
                Tuần trước
              </button>
              <button
                disabled={addDay(week, 7) > addDay(today(), catalog?.settings.horizonDays || 90)}
                onClick={() => setWeek(addDay(week, 7))}
              >
                Tuần sau
              </button>
            </div>
            {loadingDays && <p role="status">Đang kiểm tra lịch trống…</p>}
            <div className="concept-date-grid">
              {Array.from({ length: 7 }, (_, i) => addDay(week, i)).map((d) => (
                <button
                  disabled={loadingDays || !days[d]?.length}
                  key={d}
                  aria-pressed={day === d}
                  onClick={() => setDay(d)}
                >
                  {new Date(`${d}T12:00:00+07:00`).toLocaleDateString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric',
                  })}
                  <small>{days[d]?.length || 0} khung giờ</small>
                </button>
              ))}
            </div>
            <div className="concept-tabs">
              {(days[day] || []).map((s) => (
                <button
                  key={s.startAt}
                  aria-pressed={s.startAt === draft.startAt}
                  onClick={() => update({ startAt: s.startAt, photographerId: '', costumes: [] })}
                >
                  {vnTime(s.startAt).split(' ')[0]} – {vnTime(s.endAt).split(' ')[0]}
                </button>
              ))}
            </div>
            {draft.startAt && <p>Đã chọn: {vnTime(draft.startAt)}</p>}
            <p>Chỗ trống được kiểm tra lại khi tạo QR; bước này chưa giữ lịch.</p>
          </section>
        )}
        {draft.step === 3 && (
          <section>
            <h2>Chọn thợ chụp</h2>
            {!slot && <p>Quay lại ngày giờ để tải danh sách thợ hiện tại.</p>}
            <div className="concept-grid">
              {slot?.photographers.map((p) => (
                <article className="concept-card" key={p._id}>
                  <h3>{p.name}</h3>
                  <p>{p.bio}</p>
                  <div className="concept-portfolio">
                    {p.portfolio?.map((image, i) => (
                      <img
                        key={i}
                        src={image.url}
                        alt={image.caption || `Portfolio ${p.name}`}
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <button
                    aria-pressed={draft.photographerId === p._id}
                    onClick={() => update({ photographerId: p._id })}
                  >
                    Chọn {p.name}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        {draft.step === 4 && pkg && (
          <section>
            <h2>Chọn trang phục và size</h2>
            <p>Gói gồm tối đa {pkg.costumeCount} bộ. Tồn kho tính theo ngày chụp.</p>
            {costumes.map((c) => (
              <fieldset className="concept-card" key={c._id}>
                <legend>{c.name}</legend>
                {Object.entries(c.available).map(([size, available]) => (
                  <label key={size}>
                    Size {size} · còn {available}
                    <input
                      aria-label={`${c.name} size ${size}`}
                      type="number"
                      min="0"
                      max={Math.min(available, pkg.costumeCount)}
                      value={
                        draft.costumes.find((x) => x.costumeId === c._id && x.size === size)
                          ?.quantity || 0
                      }
                      onChange={(e) => {
                        const quantity = Number(e.target.value);
                        update({
                          costumes: [
                            ...draft.costumes.filter(
                              (x) => !(x.costumeId === c._id && x.size === size),
                            ),
                            ...(quantity > 0
                              ? [{ costumeId: c._id, size, quantity, name: c.name }]
                              : []),
                          ],
                        });
                      }}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
            {!costumes.length && <p>Chưa có trang phục phù hợp hoặc gói không kèm trang phục.</p>}
          </section>
        )}
        {draft.step === 5 && pkg && (
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
        {draft.step === 6 && pkg && (
          <section className="concept-card">
            <h2>Kiểm tra trước khi đặt cọc</h2>
            <h3>{pkg.name}</h3>
            <p>
              {vnTime(draft.startAt)} · {pkg.durationMinutes} phút · {draft.people} người
            </p>
            <p>
              {draft.contactName} · {draft.phone}
            </p>
            <ul>
              {draft.costumes.map((c) => (
                <li key={`${c.costumeId}:${c.size}`}>
                  {c.name} · {c.size} × {c.quantity}
                </li>
              ))}
            </ul>
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
        {draft.step > 1 && (
          <footer className="concept-actions">
            <button disabled={busy} onClick={() => update({ step: draft.step - 1 })}>
              Quay lại
            </button>
            {draft.step < 6 && <button onClick={next}>Tiếp tục</button>}
          </footer>
        )}
      </div>
    </PublicSiteLayout>
  );
}
