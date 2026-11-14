import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Check,
  Eye,
  ImagePlus,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import PhotographerPortfolio, { PortfolioImage } from '../components/PhotographerPortfolio';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { conceptError, photographerContentFields } from '../services/conceptService';
import {
  photographerPortfolioService,
  previewPortfolio,
  type PersonalPortfolio,
  type PortfolioContent,
} from '../services/photographerPortfolioService';
import { usePortfolioUnsavedChanges } from '../hooks/usePortfolioUnsavedChanges';
import '../styles/photographer-portfolio.css';

const sectionInfo = {
  approach: { title: 'Buổi chụp cùng tôi', max: 4 },
  audience: { title: 'Phù hợp nếu bạn…', max: 4 },
  milestones: { title: 'Dấu mốc & kinh nghiệm', max: 6 },
} as const;
export default function PhotographerPortfolioPage() {
  const [params, setParams] = useSearchParams();
  const fullPreview = params.get('preview') === '1';
  const [state, setState] = useState<PersonalPortfolio | null>(null);
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [tab, setTab] = useState('intro');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const files = useRef<Record<string, File>>({});
  const objectUrls = useRef<string[]>([]);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const dirty = !!state && !!content && JSON.stringify(state.content) !== JSON.stringify(content);
  usePortfolioUnsavedChanges(dirty);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    photographerPortfolioService
      .get(abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setState(value);
          setContent(value.content);
          setConflict(false);
          setError('');
          files.current = {};
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [reload]);
  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => {
    const used = new Set(
      content
        ? [content.portraitUrl, content.coverUrl, ...content.portfolio.map((p) => p.url)]
        : [],
    );
    objectUrls.current = objectUrls.current.filter((url) => {
      if (used.has(url)) return true;
      URL.revokeObjectURL(url);
      delete files.current[url];
      return false;
    });
  }, [content]);
  useEffect(() => {
    const dialog = previewDialog.current;
    if (!fullPreview || loading || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [fullPreview, loading]);
  const change = <K extends keyof PortfolioContent>(key: K, value: PortfolioContent[K]) => {
    setContent((old) => old && { ...old, [key]: value });
    setMessage('');
  };
  const addFiles = (items: FileList | null, target: 'portraitUrl' | 'coverUrl' | 'portfolio') => {
    if (!items?.length || !content || !state) return;
    const list = Array.from(items);
    if (
      list.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError('Chỉ nhận JPG, PNG, WebP, tối đa 5 MB/ảnh.');
      return;
    }
    const existing = [
      target === 'portraitUrl' ? '' : content.portraitUrl,
      target === 'coverUrl' ? '' : content.coverUrl,
      ...content.portfolio.map((p) => p.url),
    ].filter((url) => files.current[url]);
    if (new Set(existing).size + list.length > 10) {
      setError('Tối đa 10 ảnh mới mỗi lần lưu. Hãy lưu nháp trước khi thêm tiếp.');
      return;
    }
    if (target === 'portfolio' && content.portfolio.length + list.length > 100) {
      setError('Tối đa 100 ảnh tác phẩm.');
      return;
    }
    const urls = list.map((file) => {
      const url = URL.createObjectURL(file);
      files.current[url] = file;
      objectUrls.current.push(url);
      return url;
    });
    if (target === 'portfolio')
      change('portfolio', [
        ...content.portfolio,
        ...urls.map((url) => ({
          url,
          concept: state.concepts.find((c) => c.active)?._id || '',
          caption: '',
          permitted: false,
        })),
      ]);
    else change(target, urls[0]);
    setError('');
  };
  const save = async (publish: boolean) => {
    if (!state || !content || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const value = await photographerPortfolioService.save(state, content, files.current, publish);
      setState(value);
      setContent(value.content);
      files.current = {};
      setConflict(false);
      setMessage(
        publish
          ? 'Đã công khai. Portfolio trên website đã được cập nhật.'
          : 'Đã lưu nháp. Website vẫn giữ bản đã công khai.',
      );
    } catch (e) {
      const response = e as { response?: { status?: number }; message?: string };
      setError(response.response ? conceptError(e) : response.message || 'Không lưu được hồ sơ.');
      if (response.response?.status === 409) setConflict(true);
    } finally {
      setBusy(false);
    }
  };
  const refresh = () => {
    if (!dirty || window.confirm('Tải lại sẽ bỏ các thay đổi chưa lưu. Bạn muốn tiếp tục?'))
      setReload((n) => n + 1);
  };
  if (loading) return <p role="status">Đang tải portfolio…</p>;
  if (!state || !content)
    return (
      <div role="alert">
        <p>{error || 'Không tải được hồ sơ.'}</p>
        <button onClick={refresh}>Thử tải lại</button>
      </div>
    );
  const preview = previewPortfolio(state, content);
  if (fullPreview)
    return (
      <dialog
        ref={previewDialog}
        aria-label="Xem trước portfolio"
        onCancel={() => setParams({})}
        className="portfolio-full-preview customer-ui customer-tokens"
      >
        <PublicSiteLayout source="concepts">
          <div className="photographer-page">
            <button className="app-back-link photographer-back" onClick={() => setParams({})}>
              <ArrowLeft size={18} />
              Quay lại chỉnh sửa
            </button>
            <p className="portfolio-preview-notice">
              Xem trước bản nháp · Chỉ bạn nhìn thấy nội dung này
            </p>
            <PhotographerPortfolio profile={preview} privateMedia />
          </div>
        </PublicSiteLayout>
      </dialog>
    );
  const field = (key: keyof typeof photographerContentFields | 'bio', rows = 1) => {
    const config =
      key === 'bio' ? { label: 'Giới thiệu ngắn', max: 2000 } : photographerContentFields[key];
    return (
      <label className={`pp-field${rows > 2 ? ' pp-field-wide' : ''}`} key={key}>
        <span>{config.label}</span>
        {rows > 1 ? (
          <textarea
            rows={rows}
            maxLength={config.max}
            value={content[key] || ''}
            onChange={(e) => change(key, e.target.value)}
          />
        ) : (
          <input
            maxLength={config.max}
            value={content[key] || ''}
            onChange={(e) => change(key, e.target.value)}
          />
        )}
      </label>
    );
  };
  const upload = (target: 'portraitUrl' | 'coverUrl' | 'portfolio', label: string) => (
    <label className="pp-upload">
      <Camera size={16} />
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={target === 'portfolio'}
        onChange={(e) => {
          addFiles(e.target.files, target);
          e.target.value = '';
        }}
        disabled={busy || (target === 'portfolio' && !state.concepts.some((c) => c.active))}
      />
    </label>
  );
  const move = (index: number, direction: number) => {
    const next = [...content.portfolio];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    change('portfolio', next);
  };
  return (
    <div id="photographer-portfolio-editor">
      <header className="pp-header">
        <div>
          <div className="pp-title">
            <h1>Portfolio của tôi</h1>
            <span
              className={`pp-status${!dirty && !state.hasDraft && state.published ? ' pp-status-live' : ''}`}
            >
              {dirty
                ? 'Có thay đổi chưa lưu'
                : state.hasDraft
                  ? 'Có thay đổi chưa công khai'
                  : state.published
                    ? 'Đã công khai'
                    : 'Chưa công khai'}
            </span>
          </div>
          <p>Thể hiện phong cách riêng qua từng khung hình.</p>
        </div>
        <div className="pp-actions">
          <button onClick={() => void save(false)} disabled={busy || conflict}>
            <Save size={16} />
            Lưu nháp
          </button>
          <button onClick={() => setParams({ preview: '1' })} disabled={busy}>
            <Eye size={16} />
            Xem trước
          </button>
          <button
            className="pp-primary"
            onClick={() => void save(true)}
            disabled={busy || conflict}
          >
            <Upload size={16} />
            Công khai
          </button>
        </div>
      </header>
      {busy && <p role="status">Đang lưu portfolio…</p>}
      {message && (
        <p className="pp-success" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      {error && (
        <div className="pp-error" role="alert">
          {error}
          {conflict && <button onClick={refresh}>Tải lại hồ sơ</button>}
        </div>
      )}
      <div className="pp-tabs" role="tablist" aria-label="Nội dung portfolio">
        {[
          { key: 'intro', title: 'Giới thiệu' },
          { key: 'approach', title: 'Cách làm việc' },
          { key: 'photos', title: 'Ảnh concept' },
        ].map((item) => (
          <button
            key={item.key}
            id={`pp-tab-${item.key}`}
            role="tab"
            aria-selected={tab === item.key}
            aria-controls="pp-form"
            tabIndex={tab === item.key ? 0 : -1}
            onKeyDown={(event) => {
              const keys = ['intro', 'approach', 'photos'];
              const index = keys.indexOf(item.key);
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % 3
                  : event.key === 'ArrowLeft'
                    ? (index + 2) % 3
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 2
                        : -1;
              if (next >= 0) {
                event.preventDefault();
                setTab(keys[next]);
                document.getElementById(`pp-tab-${keys[next]}`)?.focus();
              }
            }}
            onClick={() => setTab(item.key)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className="pp-columns">
        <section id="pp-form" role="tabpanel" aria-labelledby={`pp-tab-${tab}`}>
          <fieldset disabled={busy} className="pp-form-fields">
            {tab === 'intro' && (
              <>
                <h2>Ảnh bìa portfolio</h2>
                <div className="pp-cover">
                  {content.coverUrl ? (
                    <PortfolioImage
                      src={content.coverUrl}
                      alt="Ảnh bìa portfolio"
                      width={1000}
                      height={300}
                      privateMedia
                    />
                  ) : (
                    <div className="pp-empty">
                      <ImagePlus size={28} />
                      <span>Thêm ảnh bìa thể hiện phong cách của bạn</span>
                    </div>
                  )}
                  {upload('coverUrl', content.coverUrl ? 'Thay ảnh' : 'Thêm ảnh bìa')}
                </div>
                {content.coverUrl && (
                  <button className="pp-text-button" onClick={() => change('coverUrl', '')}>
                    Bỏ ảnh bìa
                  </button>
                )}
                <div className="pp-identity">
                  <div className="pp-avatar">
                    {content.portraitUrl ? (
                      <PortfolioImage
                        src={content.portraitUrl}
                        alt={`Chân dung ${state.name}`}
                        width={120}
                        height={120}
                        privateMedia
                      />
                    ) : (
                      <Camera size={28} />
                    )}
                  </div>
                  <div>
                    <p>Ảnh đại diện</p>
                    {upload('portraitUrl', 'Thay ảnh')}
                    {content.portraitUrl && (
                      <button className="pp-text-button" onClick={() => change('portraitUrl', '')}>
                        Bỏ ảnh
                      </button>
                    )}
                  </div>
                  <div className="pp-account">
                    <span>Tên hiển thị (không thể chỉnh sửa)</span>
                    <strong>{state.name}</strong>
                  </div>
                </div>
                <div className="pp-fields">
                  {field('title')}
                  {field('tagline')}
                  {field('bio', 3)}
                  {field('specialty', 2)}
                  {field('style', 2)}
                  {field('guidance', 3)}
                  {field('story', 4)}
                </div>
              </>
            )}
            {tab === 'approach' && (
              <>
                <h2>Cách làm việc của bạn</h2>
                <p className="pp-hint">
                  Giúp khách hàng hiểu buổi chụp cùng bạn sẽ như thế nào. Các mục này không bắt
                  buộc.
                </p>
                {field('philosophy', 4)}
                {(Object.keys(sectionInfo) as (keyof typeof sectionInfo)[]).map((key) => (
                  <section className="pp-section" key={key}>
                    <div className="pp-section-title">
                      <h3>{sectionInfo[key].title}</h3>
                      <button
                        disabled={(content[key]?.length || 0) >= sectionInfo[key].max}
                        onClick={() =>
                          change(key, [...(content[key] || []), { title: '', description: '' }])
                        }
                      >
                        <Plus size={16} />
                        Thêm mục
                      </button>
                    </div>
                    {(content[key] || []).map((item, index) => (
                      <div className="pp-section-row" key={index}>
                        <label className="pp-field">
                          <span>Tiêu đề {index + 1}</span>
                          <input
                            maxLength={120}
                            value={item.title}
                            onChange={(e) =>
                              change(
                                key,
                                content[key]!.map((p, i) =>
                                  i === index ? { ...p, title: e.target.value } : p,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="pp-field">
                          <span>Nội dung</span>
                          <textarea
                            maxLength={600}
                            rows={3}
                            value={item.description}
                            onChange={(e) =>
                              change(
                                key,
                                content[key]!.map((p, i) =>
                                  i === index ? { ...p, description: e.target.value } : p,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          onClick={() =>
                            change(
                              key,
                              content[key]!.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                          Bỏ mục {index + 1}
                        </button>
                      </div>
                    ))}
                  </section>
                ))}
              </>
            )}
            {tab === 'photos' && (
              <>
                <div className="pp-section-title">
                  <h2>Ảnh concept</h2>
                  {upload('portfolio', 'Thêm ảnh')}
                </div>
                <p className="pp-hint">JPG, PNG, WebP · Tối đa 5 MB/ảnh · 10 ảnh mới mỗi lần lưu</p>
                {!state.concepts.some((c) => c.active) && (
                  <p className="pp-hint">
                    Studio chưa phân công concept đang hoạt động. Bạn có thể lưu phần giới thiệu
                    trước.
                  </p>
                )}
                {!content.portfolio.length && (
                  <div className="pp-empty">
                    <ImagePlus size={32} />
                    <p>
                      Chưa có ảnh tác phẩm. Thêm những khung hình thể hiện rõ phong cách của bạn.
                    </p>
                  </div>
                )}
                <div className="pp-gallery">
                  {content.portfolio.map((photo, index) => (
                    <article key={`${photo.url}-${index}`}>
                      <PortfolioImage
                        src={photo.url}
                        alt={photo.caption || `Tác phẩm ${index + 1}`}
                        width={400}
                        height={300}
                        privateMedia
                      />
                      <div className="pp-photo-controls">
                        <button
                          aria-label={`Đưa ảnh ${index + 1} lên`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          aria-label={`Đưa ảnh ${index + 1} xuống`}
                          disabled={index === content.portfolio.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          aria-label={`Xóa ảnh ${index + 1}`}
                          onClick={() =>
                            change(
                              'portfolio',
                              content.portfolio.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <label className="pp-field">
                        <span>Concept ảnh {index + 1}</span>
                        <select
                          value={photo.concept}
                          onChange={(e) =>
                            change(
                              'portfolio',
                              content.portfolio.map((p, i) =>
                                i === index ? { ...p, concept: e.target.value } : p,
                              ),
                            )
                          }
                        >
                          <option value="">Chọn concept</option>
                          {state.concepts.map((c) => (
                            <option value={c._id} key={c._id}>
                              {c.name}
                              {c.active ? '' : ' (đã ẩn)'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="pp-field">
                        <span>Chú thích ảnh {index + 1}</span>
                        <input
                          maxLength={200}
                          value={photo.caption}
                          onChange={(e) =>
                            change(
                              'portfolio',
                              content.portfolio.map((p, i) =>
                                i === index ? { ...p, caption: e.target.value } : p,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="pp-consent">
                        <input
                          type="checkbox"
                          checked={photo.permitted}
                          onChange={(e) =>
                            change(
                              'portfolio',
                              content.portfolio.map((p, i) =>
                                i === index ? { ...p, permitted: e.target.checked } : p,
                              ),
                            )
                          }
                        />
                        Được phép công khai
                      </label>
                    </article>
                  ))}
                </div>
              </>
            )}
          </fieldset>
          <div className="pp-assignment">
            <LockKeyhole size={16} />
            <span>Concept được studio phân công</span>
            {state.concepts.length ? (
              state.concepts.map((c) => (
                <span className="pp-chip" key={c._id}>
                  {c.name}
                  {!c.active && ' (đã ẩn)'}
                </span>
              ))
            ) : (
              <span>Chưa được phân công</span>
            )}
          </div>
          <p className="pp-hint">
            Lưu nháp để tiếp tục chỉnh sửa. Nội dung chỉ lên website khi bạn công khai.
          </p>
        </section>
        <aside className="pp-preview" aria-label="Xem trước trang công khai">
          <h2>Xem trước trang công khai</h2>
          <PhotographerPortfolio profile={preview} privateMedia compact />
        </aside>
      </div>
    </div>
  );
}
