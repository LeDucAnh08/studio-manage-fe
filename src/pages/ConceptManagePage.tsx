import { useEffect, useRef, useState } from 'react';
import {
  ManagedCatalog,
  Concept,
  ConceptPackage,
  Profile,
  StudioSettings,
  conceptError,
  conceptService,
  money,
  conceptDecorLabels,
  conceptDeliveryLabels,
  photographerContentFields,
} from '../services/conceptService';
import '../styles/concept.css';

const defaultPackage = {
  concept: '',
  name: '',
  imageUrl: '',
  introduction: '',
  studioSupport: [] as { title: string; description: string }[],
  delivery: { timeline: '', format: '', originals: '' },
  showcase: { title: '', description: '', images: [] as { url: string; caption: string }[] },
  decor: { backdrop: '', props: '', layout: '', included: '' },
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
type ConceptForm = Omit<Concept, '_id'> & { id?: string };
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
        if (p)
          setPkg({
            ...defaultPackage,
            ...p,
            decor: { ...defaultPackage.decor, ...p.decor },
            delivery: { ...defaultPackage.delivery, ...p.delivery },
            showcase: { ...defaultPackage.showcase, ...p.showcase },
            id: p._id,
            expectedVersion: p.version,
          });
        else setPkg(defaultPackage);
      }
    } catch (e) {
      setError(conceptError(e));
    } finally {
      setBusy(false);
    }
  };
  const editPackage = (p: ConceptPackage) =>
    setPkg({
      ...defaultPackage,
      ...p,
      decor: { ...defaultPackage.decor, ...p.decor },
      delivery: { ...defaultPackage.delivery, ...p.delivery },
      showcase: { ...defaultPackage.showcase, ...p.showcase },
      id: p._id,
      expectedVersion: p.version,
    });
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
              Ảnh đại diện
              <input
                inputMode="url"
                value={concept.coverUrl}
                onChange={(e) => setConcept({ ...concept, coverUrl: e.target.value })}
              />
            </label>
            {(
              [
                ['story', 'Câu chuyện và phong cách', 6000],
                ['styleSummary', 'Tóm tắt phong cách', 300],
                ['audience', 'Phù hợp với', 1000],
                ['setting', 'Không gian chụp', 1000],
                ['wardrobeGuidance', 'Gợi ý trang phục', 1000],
                ['preparation', 'Chuẩn bị trước buổi chụp', 2000],
              ] as const
            ).map(([field, label, max]) => (
              <label key={field}>
                {label}
                <textarea
                  maxLength={max}
                  value={concept[field] || ''}
                  onChange={(event) => setConcept({ ...concept, [field]: event.target.value })}
                />
              </label>
            ))}
            <fieldset>
              <legend>Ảnh tham khảo</legend>
              {(concept.gallery || []).map((image, index) => (
                <div className="concept-form-grid" key={index}>
                  <label>
                    Đường dẫn ảnh {index + 1}
                    <input
                      required
                      inputMode="url"
                      value={image.url}
                      onChange={(event) =>
                        setConcept({
                          ...concept,
                          gallery: concept.gallery?.map((item, i) =>
                            i === index ? { ...item, url: event.target.value } : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Chú thích ảnh {index + 1}
                    <input
                      maxLength={200}
                      value={image.caption}
                      onChange={(event) =>
                        setConcept({
                          ...concept,
                          gallery: concept.gallery?.map((item, i) =>
                            i === index ? { ...item, caption: event.target.value } : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConcept({
                        ...concept,
                        gallery: concept.gallery?.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Xóa ảnh {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={(concept.gallery?.length || 0) >= 24}
                onClick={() =>
                  setConcept({
                    ...concept,
                    gallery: [...(concept.gallery || []), { url: '', caption: '' }],
                  })
                }
              >
                Thêm ảnh tham khảo
              </button>
            </fieldset>
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
            <label>
              Ảnh minh họa gói
              <input
                inputMode="url"
                value={pkg.imageUrl}
                onChange={(event) => setPkg({ ...pkg, imageUrl: event.target.value })}
              />
            </label>
            <fieldset>
              <legend>Decor &amp; bối cảnh</legend>
              <div className="concept-form-grid">
                {Object.entries(conceptDecorLabels).map(([field, label]) => (
                  <label key={field}>
                    {label}
                    <textarea
                      maxLength={1000}
                      value={pkg.decor[field as keyof typeof conceptDecorLabels]}
                      onChange={(event) =>
                        setPkg({ ...pkg, decor: { ...pkg.decor, [field]: event.target.value } })
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Lời giới thiệu gói
              <textarea
                maxLength={1000}
                value={pkg.introduction}
                onChange={(e) => setPkg({ ...pkg, introduction: e.target.value })}
              />
            </label>
            <fieldset>
              <legend>Studio đồng hành cùng bạn</legend>
              {pkg.studioSupport.map((item, index) => (
                <div className="concept-form-grid" key={index}>
                  <label>
                    Tiêu đề quyền lợi {index + 1}
                    <input
                      required
                      maxLength={120}
                      value={item.title}
                      onChange={(e) =>
                        setPkg({
                          ...pkg,
                          studioSupport: pkg.studioSupport.map((row, i) =>
                            i === index ? { ...row, title: e.target.value } : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Mô tả quyền lợi {index + 1}
                    <textarea
                      required
                      maxLength={500}
                      value={item.description}
                      onChange={(e) =>
                        setPkg({
                          ...pkg,
                          studioSupport: pkg.studioSupport.map((row, i) =>
                            i === index ? { ...row, description: e.target.value } : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPkg({
                        ...pkg,
                        studioSupport: pkg.studioSupport.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Xóa quyền lợi {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={pkg.studioSupport.length >= 4}
                onClick={() =>
                  setPkg({
                    ...pkg,
                    studioSupport: [...pkg.studioSupport, { title: '', description: '' }],
                  })
                }
              >
                Thêm quyền lợi
              </button>
            </fieldset>
            <fieldset>
              <legend>Bộ ảnh bạn nhận được</legend>
              <p>
                Số ảnh chỉnh sửa lấy từ gói; album riêng và hai vòng góp ý theo quy trình hiện tại.
              </p>
              {Object.entries(conceptDeliveryLabels).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <textarea
                    maxLength={1000}
                    value={pkg.delivery[field as keyof typeof conceptDeliveryLabels]}
                    onChange={(e) =>
                      setPkg({ ...pkg, delivery: { ...pkg.delivery, [field]: e.target.value } })
                    }
                  />
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Bộ ảnh giới thiệu</legend>
              <p>
                Thêm bộ ảnh khách đã chụp hoặc hai ảnh cùng khung hình với chú thích “Trước hậu kỳ”
                và “Sau hậu kỳ”.
              </p>
              <label>
                Tiêu đề bộ ảnh
                <input
                  maxLength={120}
                  value={pkg.showcase.title}
                  onChange={(e) =>
                    setPkg({ ...pkg, showcase: { ...pkg.showcase, title: e.target.value } })
                  }
                />
              </label>
              <label>
                Câu chuyện bộ ảnh
                <textarea
                  maxLength={1000}
                  value={pkg.showcase.description}
                  onChange={(e) =>
                    setPkg({ ...pkg, showcase: { ...pkg.showcase, description: e.target.value } })
                  }
                />
              </label>
              {pkg.showcase.images.map((image, index) => (
                <div className="concept-form-grid" key={index}>
                  <label>
                    Đường dẫn ảnh giới thiệu {index + 1}
                    <input
                      required
                      inputMode="url"
                      value={image.url}
                      onChange={(e) =>
                        setPkg({
                          ...pkg,
                          showcase: {
                            ...pkg.showcase,
                            images: pkg.showcase.images.map((row, i) =>
                              i === index ? { ...row, url: e.target.value } : row,
                            ),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Chú thích ảnh giới thiệu {index + 1}
                    <input
                      maxLength={200}
                      value={image.caption}
                      onChange={(e) =>
                        setPkg({
                          ...pkg,
                          showcase: {
                            ...pkg.showcase,
                            images: pkg.showcase.images.map((row, i) =>
                              i === index ? { ...row, caption: e.target.value } : row,
                            ),
                          },
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPkg({
                        ...pkg,
                        showcase: {
                          ...pkg.showcase,
                          images: pkg.showcase.images.filter((_, i) => i !== index),
                        },
                      })
                    }
                  >
                    Xóa ảnh giới thiệu {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={pkg.showcase.images.length >= 6}
                onClick={() =>
                  setPkg({
                    ...pkg,
                    showcase: {
                      ...pkg.showcase,
                      images: [...pkg.showcase.images, { url: '', caption: '' }],
                    },
                  })
                }
              >
                Thêm ảnh giới thiệu
              </button>
            </fieldset>
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
            <legend>Nội dung cá nhân hóa</legend>
            {(['portraitUrl', 'coverUrl'] as const).map((field) => (
              <label key={field}>
                {field === 'portraitUrl' ? 'Ảnh chân dung thợ' : 'Ảnh bìa portfolio'}
                <input
                  inputMode="url"
                  value={profile[field] || ''}
                  onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
                />
              </label>
            ))}
            {Object.entries(photographerContentFields).map(([field, config]) => (
              <label key={field}>
                {config.label}
                <textarea
                  maxLength={config.max}
                  value={profile[field as keyof typeof photographerContentFields] || ''}
                  onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
                />
              </label>
            ))}
          </fieldset>
          {(['approach', 'audience', 'milestones'] as const).map((field) => (
            <fieldset key={field}>
              <legend>
                {
                  {
                    approach: 'Buổi chụp cùng tôi',
                    audience: 'Phù hợp nếu bạn…',
                    milestones: 'Dấu mốc & kinh nghiệm',
                  }[field]
                }
              </legend>
              {(profile[field] || []).map((item, index) => (
                <div key={index} className="concept-form-grid">
                  <label>
                    Tiêu đề {index + 1}
                    <input
                      required
                      maxLength={120}
                      value={item.title}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          [field]: profile[field]?.map((row, i) =>
                            i === index ? { ...row, title: e.target.value } : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Nội dung {index + 1}
                    <textarea
                      maxLength={600}
                      value={item.description}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          [field]: profile[field]?.map((row, i) =>
                            i === index ? { ...row, description: e.target.value } : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        [field]: profile[field]?.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Bỏ mục {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={(profile[field]?.length || 0) >= (field === 'milestones' ? 6 : 4)}
                onClick={() =>
                  setProfile({
                    ...profile,
                    [field]: [...(profile[field] || []), { title: '', description: '' }],
                  })
                }
              >
                Thêm mục
              </button>
            </fieldset>
          ))}
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
                Đường dẫn ảnh
                <input
                  required
                  inputMode="url"
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
