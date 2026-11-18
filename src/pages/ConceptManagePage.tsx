import { useEffect, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ExternalLink, ImageIcon, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { usePortfolioUnsavedChanges } from '../hooks/usePortfolioUnsavedChanges';
import { Concept, conceptError, conceptService } from '../services/conceptService';
import '../styles/concept-manage.css';

type ConceptForm = Omit<Concept, '_id'> & { id?: string };
const emptyForm = (): ConceptForm => ({
  name: '',
  description: '',
  coverUrl: '',
  active: true,
  story: '',
  styleSummary: '',
  audience: '',
  setting: '',
  wardrobeGuidance: '',
  preparation: '',
  gallery: [],
});
const editForm = ({ _id, ...value }: Concept): ConceptForm => ({
  ...emptyForm(),
  ...value,
  id: _id,
});
const sections = [
  ['general', 'Thông tin chung'],
  ['introduction', 'Nội dung giới thiệu'],
  ['gallery', 'Ảnh tham khảo'],
  ['preparation', 'Hướng dẫn chuẩn bị'],
] as const;

function ConceptImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className="concept-manage-image">
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <ImageIcon aria-label={src ? 'Không tải được ảnh' : 'Chưa có ảnh'} />
      )}
    </div>
  );
}

export default function ConceptManagePage() {
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [form, setForm] = useState<ConceptForm>(emptyForm);
  const [baseline, setBaseline] = useState<ConceptForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('general');
  const [showCoverUrl, setShowCoverUrl] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingForm, setPendingForm] = useState<ConceptForm | null>(null);
  const receipt = useRef<{ signature: string; key: string } | null>(null);
  const saving = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  usePortfolioUnsavedChanges(dirty);

  useEffect(() => {
    let active = true;
    conceptService
      .manage()
      .then((data) => {
        if (!active) return;
        setConcepts(data.concepts);
        const initial = data.concepts[0] ? editForm(data.concepts[0]) : emptyForm();
        setForm(initial);
        setBaseline(initial);
      })
      .catch((e) => {
        if (active) setError(conceptError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openForm = (next: ConceptForm) => {
    setForm(next);
    setBaseline(next);
    setSection('general');
    setShowCoverUrl(false);
    setError('');
    setMessage('');
  };
  const choose = (next: ConceptForm) => {
    if (busy) return;
    if (dirty) setPendingForm(next);
    else openForm(next);
  };
  const change = <K extends keyof ConceptForm>(key: K, value: ConceptForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };
  const save = async () => {
    if (saving.current) return;
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên concept.');
      setSection('general');
      requestAnimationFrame(() => nameInput.current?.focus());
      return;
    }
    if (form.gallery?.some((image) => !image.url.trim())) {
      setError('Vui lòng nhập đường dẫn cho từng ảnh tham khảo hoặc xóa ảnh trống.');
      setSection('gallery');
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const signature = JSON.stringify(form);
      if (receipt.current?.signature !== signature)
        receipt.current = { signature, key: crypto.randomUUID() };
      await conceptService.save('concept', form, receipt.current.key);
      const data = await conceptService.manage();
      setConcepts(data.concepts);
      const created = data.concepts.filter(
        (item) => !concepts?.some((old) => old._id === item._id) && item.name === form.name.trim(),
      );
      const saved = form.id
        ? data.concepts.find((item) => item._id === form.id)
        : created.length === 1
          ? created[0]
          : undefined;
      const next = saved ? editForm(saved) : emptyForm();
      setForm(next);
      setBaseline(next);
      receipt.current = null;
      setMessage('Đã lưu concept.');
    } catch (e) {
      // Preserve the key even if the refresh fails after a successful creation.
      setError(conceptError(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const selected = concepts?.find((item) => item._id === form.id);
  const filtered =
    concepts?.filter((item) =>
      item.name.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')),
    ) || [];
  const textFields = (
    fields: readonly (readonly [
      keyof Pick<
        ConceptForm,
        'story' | 'styleSummary' | 'audience' | 'setting' | 'wardrobeGuidance' | 'preparation'
      >,
      string,
      number,
    ])[],
  ) =>
    fields.map(([key, label, maxLength]) => (
      <label className="concept-manage-field" key={key}>
        {label}
        <textarea
          value={form[key] || ''}
          maxLength={maxLength}
          rows={key === 'story' || key === 'preparation' ? 6 : 3}
          onChange={(event) => change(key, event.target.value)}
        />
      </label>
    ));

  return (
    <div className="concept-manage">
      <header className="concept-manage-heading">
        <h1>Quản lý concept</h1>
        <p>Quản lý nội dung, hình ảnh và trạng thái hiển thị của concept.</p>
      </header>
      {error && (
        <div className="concept-manage-notice is-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="concept-manage-notice is-success" role="status">
          {message}
        </div>
      )}
      {loading && <p role="status">Đang tải concept…</p>}
      {!loading && !concepts && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          Thử tải lại
        </Button>
      )}
      {concepts && (
        <div className="concept-manage-layout">
          <aside className="concept-manage-list" aria-label="Danh sách concept">
            <div className="concept-manage-tools">
              <label className="concept-manage-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Tìm concept"
                  placeholder="Tìm concept"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <Button variant="outline" disabled={busy} onClick={() => choose(emptyForm())}>
                <Plus size={17} aria-hidden="true" /> Thêm concept
              </Button>
            </div>
            <div className="concept-manage-items">
              {filtered.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="concept-manage-item"
                  aria-label={`${item.name}, ${item.active ? 'Đang mở' : 'Đang ẩn'}`}
                  aria-pressed={form.id === item._id}
                  disabled={busy}
                  onClick={() => {
                    if (item._id !== form.id) choose(editForm(item));
                  }}
                >
                  <ConceptImage src={item.coverUrl} />
                  <span className="concept-manage-item-name">{item.name}</span>
                  <span className={`concept-manage-status ${item.active ? 'is-active' : ''}`}>
                    {item.active ? 'Đang mở' : 'Đang ẩn'}
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <p className="concept-manage-empty">
                  {concepts.length
                    ? 'Không tìm thấy concept phù hợp.'
                    : 'Chưa có concept. Thêm concept đầu tiên để bắt đầu.'}
                </p>
              )}
            </div>
          </aside>
          <form
            className="concept-manage-editor"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <header className="concept-manage-editor-heading">
              <div>
                <h2>{selected?.name || 'Thêm concept mới'}</h2>
                {selected && (
                  <span className={`concept-manage-status ${selected.active ? 'is-active' : ''}`}>
                    {selected.active ? 'Đang mở' : 'Đang ẩn'}
                  </span>
                )}
              </div>
              {selected?.active && (
                <a
                  className="concept-manage-public"
                  href={`/concept-booking?concept=${selected._id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={17} aria-hidden="true" />
                  Xem trang khách
                </a>
              )}
            </header>
            <fieldset className="concept-manage-fields" disabled={busy}>
              <legend className="sr-only">Nội dung concept</legend>
              <Tabs.Root value={section} onValueChange={setSection}>
                <Tabs.List className="concept-manage-tabs" aria-label="Nội dung concept">
                  {sections.map(([key, label]) => (
                    <Tabs.Trigger key={key} value={key} type="button">
                      {label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
                <Tabs.Content value="general" className="concept-manage-panel">
                  <div className="concept-manage-general">
                    <div className="concept-manage-cover">
                      <ConceptImage src={form.coverUrl} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-expanded={showCoverUrl}
                        onClick={() => setShowCoverUrl(!showCoverUrl)}
                      >
                        <ImageIcon size={16} aria-hidden="true" />
                        Thay ảnh
                      </Button>
                      {(showCoverUrl || !form.coverUrl) && (
                        <label className="concept-manage-field">
                          Đường dẫn ảnh bìa
                          <input
                            value={form.coverUrl}
                            inputMode="url"
                            placeholder="https://… hoặc /images/…"
                            onChange={(event) => change('coverUrl', event.target.value)}
                          />
                          <small>Dùng đường dẫn ảnh đã tải lên hoặc URL ảnh công khai.</small>
                        </label>
                      )}
                    </div>
                    <div className="concept-manage-summary">
                      <label className="concept-manage-field">
                        Tên concept <span className="concept-manage-required">*</span>
                        <input
                          ref={nameInput}
                          required
                          maxLength={120}
                          value={form.name}
                          onChange={(event) => change('name', event.target.value)}
                        />
                      </label>
                      <label className="concept-manage-field">
                        Mô tả ngắn
                        <textarea
                          maxLength={4000}
                          rows={4}
                          value={form.description}
                          onChange={(event) => change('description', event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="concept-manage-visibility">
                    <div>
                      <label htmlFor="concept-visible">Hiển thị concept</label>
                      <p>Cho phép khách hàng xem concept này trên trang khách.</p>
                    </div>
                    <input
                      id="concept-visible"
                      type="checkbox"
                      role="switch"
                      checked={form.active}
                      onChange={(event) => change('active', event.target.checked)}
                    />
                  </div>
                </Tabs.Content>
                <Tabs.Content value="introduction" className="concept-manage-panel">
                  {textFields([
                    ['styleSummary', 'Tóm tắt phong cách', 300],
                    ['story', 'Câu chuyện và phong cách', 6000],
                    ['audience', 'Phù hợp với', 1000],
                    ['setting', 'Không gian chụp', 1000],
                  ])}
                </Tabs.Content>
                <Tabs.Content value="gallery" className="concept-manage-panel">
                  <div className="concept-manage-section-heading">
                    <div>
                      <h3>Ảnh tham khảo</h3>
                      <p>Hình ảnh giúp khách hàng hình dung phong cách concept. Tối đa 24 ảnh.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={(form.gallery?.length || 0) >= 24}
                      onClick={() =>
                        change('gallery', [...(form.gallery || []), { url: '', caption: '' }])
                      }
                    >
                      <Plus size={16} aria-hidden="true" />
                      Thêm ảnh
                    </Button>
                  </div>
                  {!form.gallery?.length && (
                    <p className="concept-manage-empty">
                      Chưa có ảnh tham khảo. Thêm ảnh để giới thiệu concept.
                    </p>
                  )}
                  {form.gallery?.map((image, index) => (
                    <div className="concept-manage-gallery-item" key={index}>
                      <ConceptImage src={image.url} />
                      <div>
                        <label className="concept-manage-field">
                          Đường dẫn ảnh {index + 1}
                          <input
                            required
                            inputMode="url"
                            value={image.url}
                            onChange={(event) =>
                              change(
                                'gallery',
                                form.gallery?.map((item, at) =>
                                  at === index ? { ...item, url: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="concept-manage-field">
                          Chú thích ảnh {index + 1}
                          <input
                            maxLength={200}
                            value={image.caption}
                            onChange={(event) =>
                              change(
                                'gallery',
                                form.gallery?.map((item, at) =>
                                  at === index ? { ...item, caption: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Xóa ảnh ${index + 1}`}
                        onClick={() =>
                          change(
                            'gallery',
                            form.gallery?.filter((_, at) => at !== index),
                          )
                        }
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </Tabs.Content>
                <Tabs.Content value="preparation" className="concept-manage-panel">
                  {textFields([
                    ['wardrobeGuidance', 'Gợi ý trang phục', 1000],
                    ['preparation', 'Chuẩn bị trước buổi chụp', 2000],
                  ])}
                </Tabs.Content>
              </Tabs.Root>
            </fieldset>
            <footer className="concept-manage-actions">
              <span>{dirty ? 'Có thay đổi chưa lưu' : 'Thay đổi được áp dụng sau khi lưu.'}</span>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !dirty}
                  onClick={() => choose(baseline)}
                >
                  Hủy thay đổi
                </Button>
                <Button type="submit" disabled={busy || (!dirty && !!form.id)}>
                  {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
                </Button>
              </div>
            </footer>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={!!pendingForm}
        onOpenChange={(open) => {
          if (!open) setPendingForm(null);
        }}
        title="Bỏ thay đổi chưa lưu?"
        message="Các thay đổi chưa lưu của concept hiện tại sẽ bị bỏ."
        cancelLabel="Tiếp tục chỉnh sửa"
        confirmLabel="Bỏ thay đổi"
        destructive={false}
        onConfirm={() => {
          if (pendingForm) openForm(pendingForm);
          setPendingForm(null);
        }}
      />
    </div>
  );
}
