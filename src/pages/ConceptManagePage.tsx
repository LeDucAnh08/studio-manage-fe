import { useEffect, useRef, useState } from 'react';
import {
  ManagedCatalog,
  ConceptPackage,
  Profile,
  StudioSettings,
  conceptError,
  conceptService,
  money,
} from '../services/conceptService';
import '../styles/concept.css';

const defaultPackage = {
  concept: '',
  name: '',
  price: 1000000,
  durationMinutes: 60,
  maxPeople: 2,
  retouchQuota: 10,
  extraPhotoPrice: 50000,
  costumeTypes: [] as string[],
  costumeCount: 1,
  active: true,
};
type PackageForm = typeof defaultPackage & { id?: string; expectedVersion?: number };
type ConceptForm = {
  id?: string;
  name: string;
  description: string;
  coverUrl: string;
  active: boolean;
};
type ProfileForm = Omit<Profile, '_id'> & { id?: string };
export default function ConceptManagePage() {
  const [data, setData] = useState<ManagedCatalog | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('concept');
  const [concept, setConcept] = useState<ConceptForm>({
      name: '',
      description: '',
      coverUrl: '',
      active: true,
    }),
    [pkg, setPkg] = useState<PackageForm>(defaultPackage);
  const [profile, setProfile] = useState<ProfileForm>({
    photographer: '',
    concepts: [],
    bio: '',
    published: false,
    portfolio: [],
  });
  const [cfg, setCfg] = useState<StudioSettings | null>(null);
  useEffect(() => {
    let active = true;
    conceptService
      .manage()
      .then((d) => {
        if (active) {
          setData(d);
          setCfg(d.settings);
        }
      })
      .catch((e) => {
        if (active) setError(conceptError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const receipt = useRef<{ signature: string; key: string } | null>(null);
  const save = async (kind: string, body: unknown) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const signature = JSON.stringify({ kind, body });
      if (receipt.current?.signature !== signature)
        receipt.current = { signature, key: crypto.randomUUID() };
      await conceptService.save(kind, body, receipt.current.key);
      receipt.current = null;
      const d = await conceptService.manage();
      setData(d);
      setCfg(d.settings);
      setMessage('Đã lưu.');
      if (kind === 'concept' && !(body as ConceptForm).id)
        setConcept({ name: '', description: '', coverUrl: '', active: true });
      if (kind === 'profile') {
        const saved = d.profiles.find((p) => p.photographer === (body as ProfileForm).photographer);
        if (saved) setProfile({ ...saved, id: saved._id });
      }
      if (kind === 'package') {
        const value = body as PackageForm;
        const p = d.packages.find((p) => p._id === value.id);
        if (p) setPkg({ ...p, id: p._id, expectedVersion: p.version });
        else setPkg(defaultPackage);
      }
    } catch (e) {
      setError(conceptError(e));
    } finally {
      setBusy(false);
    }
  };
  const editPackage = (p: ConceptPackage) =>
    setPkg({ ...p, id: p._id, expectedVersion: p.version });
  return (
    <div className="concept-workspace">
      <h1>Concept, gói chụp và ekip</h1>
      <p>Thiết lập giá theo buổi, năng lực thợ và giờ studio trước khi mở đặt lịch.</p>
      <div className="concept-tabs">
        {[
          ['concept', 'Concept'],
          ['package', 'Gói chụp'],
          ['profile', 'Hồ sơ thợ'],
          ['settings', 'Giờ Studio'],
        ].map(([key, label]) => (
          <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="concept-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data && tab === 'concept' && (
        <>
          <div className="concept-grid">
            {data.concepts.map((c) => (
              <article className="concept-card" key={c._id}>
                <h2>{c.name}</h2>
                <p>{c.active ? 'Đang mở' : 'Đang ẩn'}</p>
                <button onClick={() => setConcept({ ...c, id: c._id })}>Chỉnh sửa</button>
              </article>
            ))}
          </div>
          <form
            className="concept-card"
            onSubmit={(e) => {
              e.preventDefault();
              void save('concept', concept);
            }}
          >
            <h2>{concept.id ? 'Sửa concept' : 'Thêm concept'}</h2>
            <label>
              Tên concept
              <input
                required
                maxLength={120}
                value={concept.name}
                onChange={(e) => setConcept({ ...concept, name: e.target.value })}
              />
            </label>
            <label>
              Mô tả
              <textarea
                maxLength={4000}
                value={concept.description}
                onChange={(e) => setConcept({ ...concept, description: e.target.value })}
              />
            </label>
            <label>
              Ảnh đại diện (HTTPS)
              <input
                type="url"
                value={concept.coverUrl}
                onChange={(e) => setConcept({ ...concept, coverUrl: e.target.value })}
              />
            </label>
            <label className="concept-check">
              <input
                type="checkbox"
                checked={concept.active}
                onChange={(e) => setConcept({ ...concept, active: e.target.checked })}
              />
              Hiển thị concept
            </label>
            <div className="concept-actions">
              <button disabled={busy} type="submit">
                Lưu concept
              </button>
              <button
                type="button"
                onClick={() =>
                  setConcept({ name: '', description: '', coverUrl: '', active: true })
                }
              >
                Thêm mới
              </button>
            </div>
          </form>
        </>
      )}
      {data && tab === 'package' && (
        <>
          <div className="concept-grid">
            {data.packages.map((p) => (
              <article className="concept-card" key={p._id}>
                <h2>{p.name}</h2>
                <p>
                  {data.concepts.find((c) => c._id === p.concept)?.name} · {money(p.price)} ·{' '}
                  {p.durationMinutes} phút · {p.active ? 'Đang mở' : 'Đang ẩn'}
                </p>
                <button onClick={() => editPackage(p)}>Chỉnh sửa</button>
              </article>
            ))}
          </div>
          <form
            className="concept-card"
            onSubmit={(e) => {
              e.preventDefault();
              void save('package', pkg);
            }}
          >
            <h2>{pkg.id ? 'Sửa gói chụp' : 'Thêm gói chụp'}</h2>
            <label>
              Concept
              <select
                required
                value={pkg.concept}
                onChange={(e) => setPkg({ ...pkg, concept: e.target.value })}
              >
                <option value="">Chọn concept</option>
                {data.concepts.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên gói
              <input
                required
                value={pkg.name}
                onChange={(e) => setPkg({ ...pkg, name: e.target.value })}
              />
            </label>
            <div className="concept-form-grid">
              {(
                [
                  ['price', 'Giá mỗi buổi', 1000, 100000000],
                  ['durationMinutes', 'Thời lượng (phút)', 30, 600],
                  ['maxPeople', 'Số người tối đa', 1, 100],
                  ['retouchQuota', 'Quota retouch', 1, 500],
                  ['extraPhotoPrice', 'Phí mỗi ảnh thêm', 1, 100000000],
                  ['costumeCount', 'Số bộ trang phục', 0, 100],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    type="number"
                    min={min}
                    max={max}
                    value={pkg[key]}
                    onChange={(e) => setPkg({ ...pkg, [key]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
            <fieldset>
              <legend>Loại trang phục được dùng</legend>
              {data.costumeTypes.map((c) => (
                <label className="concept-check" key={c._id}>
                  <input
                    type="checkbox"
                    checked={pkg.costumeTypes.includes(c._id)}
                    onChange={(e) =>
                      setPkg({
                        ...pkg,
                        costumeTypes: e.target.checked
                          ? [...pkg.costumeTypes, c._id]
                          : pkg.costumeTypes.filter((id) => id !== c._id),
                      })
                    }
                  />
                  {c.name}
                </label>
              ))}
            </fieldset>
            <label className="concept-check">
              <input
                type="checkbox"
                checked={pkg.active}
                onChange={(e) => setPkg({ ...pkg, active: e.target.checked })}
              />
              Mở đặt gói
            </label>
            <div className="concept-actions">
              <button disabled={busy}>Lưu gói</button>
              <button type="button" onClick={() => setPkg(defaultPackage)}>
                Thêm mới
              </button>
            </div>
          </form>
        </>
      )}
      {data && tab === 'profile' && (
        <form
          className="concept-card"
          onSubmit={(e) => {
            e.preventDefault();
            void save('profile', profile);
          }}
        >
          <h2>Portfolio và năng lực thợ</h2>
          <label>
            Thợ chụp
            <select
              required
              value={profile.photographer}
              onChange={(e) => {
                const p = data.profiles.find((p) => p.photographer === e.target.value);
                setProfile(
                  p
                    ? { ...p, id: p._id }
                    : {
                        photographer: e.target.value,
                        concepts: [],
                        bio: '',
                        published: false,
                        portfolio: [],
                      },
                );
              }}
            >
              <option value="">Chọn thợ</option>
              {data.photographers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name || p._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giới thiệu
            <textarea
              maxLength={2000}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </label>
          <fieldset>
            <legend>Concept có thể chụp</legend>
            {data.concepts.map((c) => (
              <label className="concept-check" key={c._id}>
                <input
                  type="checkbox"
                  checked={profile.concepts.includes(c._id)}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      concepts: e.target.checked
                        ? [...profile.concepts, c._id]
                        : profile.concepts.filter((id) => id !== c._id),
                    })
                  }
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          <label className="concept-check">
            <input
              type="checkbox"
              checked={profile.published}
              onChange={(e) => setProfile({ ...profile, published: e.target.checked })}
            />
            Hiển thị hồ sơ và nhận đặt chụp concept
          </label>
          <h3>Ảnh portfolio</h3>
          {profile.portfolio.map((p, i) => (
            <fieldset key={i}>
              <label>
                Concept ảnh
                <select
                  required
                  value={p.concept}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio: profile.portfolio.map((p, n) =>
                        n === i ? { ...p, concept: e.target.value } : p,
                      ),
                    })
                  }
                >
                  <option value="">Chọn concept</option>
                  {data.concepts
                    .filter((c) => profile.concepts.includes(c._id))
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Ảnh (HTTPS)
                <input
                  required
                  type="url"
                  value={p.url}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio: profile.portfolio.map((p, n) =>
                        n === i ? { ...p, url: e.target.value } : p,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Mô tả ảnh
                <input
                  maxLength={200}
                  value={p.caption}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio: profile.portfolio.map((p, n) =>
                        n === i ? { ...p, caption: e.target.value } : p,
                      ),
                    })
                  }
                />
              </label>
              <label className="concept-check">
                <input
                  required
                  type="checkbox"
                  checked={p.permitted}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      portfolio: profile.portfolio.map((p, n) =>
                        n === i ? { ...p, permitted: e.target.checked } : p,
                      ),
                    })
                  }
                />
                Studio có quyền sử dụng công khai ảnh này
              </label>
              <button
                type="button"
                onClick={() =>
                  setProfile({ ...profile, portfolio: profile.portfolio.filter((_, n) => n !== i) })
                }
              >
                Bỏ ảnh
              </button>
            </fieldset>
          ))}
          <div className="concept-actions">
            <button
              type="button"
              onClick={() =>
                setProfile({
                  ...profile,
                  portfolio: [
                    ...profile.portfolio,
                    { concept: '', url: '', caption: '', permitted: false },
                  ],
                })
              }
            >
              Thêm ảnh portfolio
            </button>
            <button disabled={busy}>Lưu hồ sơ thợ</button>
          </div>
        </form>
      )}
      {cfg && tab === 'settings' && (
        <form
          className="concept-card"
          onSubmit={(e) => {
            e.preventDefault();
            void save('settings', { ...cfg, expectedVersion: cfg.version });
          }}
        >
          <h2>Giờ mở cửa Studio</h2>
          <p>
            Một buổi concept tại một thời điểm. Thay đổi áp dụng cho lựa chọn mới; lịch đã chốt được
            giữ nguyên.
          </p>
          <div className="concept-form-grid">
            {(
              [
                ['openMinutes', 'Giờ mở cửa'],
                ['closeMinutes', 'Giờ đóng cửa'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required
                  type="time"
                  value={`${String(Math.floor(cfg[key] / 60)).padStart(2, '0')}:${String(cfg[key] % 60).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    setCfg({ ...cfg, [key]: h * 60 + m });
                  }}
                />
              </label>
            ))}
            {(
              [
                ['stepMinutes', 'Khoảng khung giờ (phút)', 5, 120],
                ['bufferMinutes', 'Nghỉ giữa hai buổi (phút)', 0, 180],
                ['horizonDays', 'Số ngày mở lịch trước', 1, 365],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <input
                  required
                  type="number"
                  min={min}
                  max={max}
                  value={cfg[key]}
                  onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <fieldset>
            <legend>Ngày nghỉ hằng tuần</legend>
            {['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'].map(
              (d, i) => (
                <label className="concept-check" key={d}>
                  <input
                    type="checkbox"
                    checked={cfg.closedWeekdays.includes(i)}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        closedWeekdays: e.target.checked
                          ? [...cfg.closedWeekdays, i]
                          : cfg.closedWeekdays.filter((day) => day !== i),
                      })
                    }
                  />
                  {d}
                </label>
              ),
            )}
          </fieldset>
          <button disabled={busy}>Lưu giờ studio</button>
        </form>
      )}
    </div>
  );
}
