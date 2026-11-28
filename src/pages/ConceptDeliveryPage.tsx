import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCustomerAppearance } from '@/components/customer/CustomerAppearance';
import {
  OrderButton as Button,
  OrderSelect,
  OrderTextarea,
} from '@/components/customer/CustomerOrderControls';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerTextarea } from '@/components/customer/CustomerFields';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { ConceptLocalGallery, ConceptPhotoImage } from '@/components/ConceptAlbumMedia';
import { ConceptDeliveryWorkspace } from '@/components/ConceptDeliveryWorkspace';
import {
  conceptError,
  conceptService,
  conceptStatus,
  money,
  vnTime,
  type ConceptAlbum,
  type ConceptOrder,
  type ConceptPhoto,
} from '@/services/conceptService';
import '../styles/booking-album.css';
import '../styles/booking-delivery.css';
import '../styles/customer-drive-album.css';

const pageSize = 60;
const stripSize = 10;
const noteLimit = 2000;
const mobileGallery = '(max-width: 700px)';
const fallbackRatio = 4 / 3;

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function ConceptDriveGallery({
  orderId,
  order,
  album,
  original,
  version,
  photos,
  replacementByOriginal,
  busy,
  onCommand,
  onDownload,
}: {
  orderId: string;
  order: ConceptOrder;
  album: ConceptAlbum;
  original: boolean;
  version: number;
  photos: ConceptPhoto[];
  replacementByOriginal: Map<string, ConceptPhoto>;
  busy: boolean;
  onCommand: (op: string, body?: Record<string, unknown>) => Promise<boolean>;
  onDownload: (photo: ConceptPhoto) => void;
}) {
  const thumbnailCache = useMemo(() => new Map<string, Blob>(), []);
  useEffect(() => () => thumbnailCache.clear(), [thumbnailCache]);

  const [annotatedOnly, setAnnotatedOnly] = useState(false);
  const [shown, setShown] = useState(pageSize);
  const [activeId, setActiveId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  const [columns, setColumns] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.(mobileGallery).matches ? 2 : 4,
  );
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const noteId = useId();
  const gallery = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia(mobileGallery);
    const update = () => setColumns(media.matches ? 2 : 4);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const canRequest = original && album.status === 'selecting' && order.isOwner;
  const annotated = (photo: ConceptPhoto) => (original ? !!photo.selected : !!photo.note);
  const filtered = photos.filter((photo) => !annotatedOnly || annotated(photo));
  const selectedPhotos = photos.filter((photo) => photo.selected);
  const extraFee =
    Math.max(0, selectedPhotos.length - order.snapshot.retouchQuota) *
    order.snapshot.extraPhotoPrice;
  const active = photos.find((photo) => photo.id === activeId);
  const viewing = !!active;
  const viewPhotos = filtered.some((photo) => photo.id === activeId) ? filtered : photos;
  const activeIndex = viewPhotos.findIndex((photo) => photo.id === activeId);
  const stripStart = Math.max(0, Math.min(activeIndex - 4, viewPhotos.length - stripSize));

  const cover =
    original &&
    photos.find(
      (photo) =>
        (album.coverId && photo.driveId === album.coverId) ||
        replacementByOriginal.has(photo.id) ||
        photo.available,
    );

  const ratioOf = (photo: ConceptPhoto) => {
    const img = replacementByOriginal.get(photo.id) ?? photo;
    const key = `${img.id}:${img.sourceVersion || ''}`;
    const ratio = img.width / img.height;
    return ratios[key] ?? (ratio > 0 && Number.isFinite(ratio) ? ratio : fallbackRatio);
  };

  const measureImage = (photo: ConceptPhoto, { target }: SyntheticEvent) => {
    if (!(target instanceof HTMLImageElement) || !target.naturalHeight) return;
    const img = replacementByOriginal.get(photo.id) ?? photo;
    const key = `${img.id}:${img.sourceVersion || ''}`;
    const ratio = target.naturalWidth / target.naturalHeight;
    if (ratio > 0 && ratio !== ratioOf(photo)) {
      setRatios((current) => ({ ...current, [key]: ratio }));
    }
  };

  const note = active ? (drafts[active.id] ?? active.note ?? '') : '';
  const dirty = !!active && note !== (active.note ?? '');

  return (
    <div className="customer-drive-album customer-tokens customer-ui customer-drive-album--embedded">
      <div className="customer-drive-album__width customer-drive-album__content">
        <div ref={gallery} hidden={viewing}>
          <div className="customer-drive-album__intro">
            {cover && (
              <div className="customer-drive-album__cover">
                <ConceptPhotoImage
                  orderId={orderId}
                  photo={replacementByOriginal.get(cover.id) ?? cover}
                  thumbnail
                  thumbnailCache={thumbnailCache}
                />
              </div>
            )}
            <div className="customer-drive-album__identity">
              <h2>{album.title}</h2>
              <p className="customer-drive-album__meta">
                {!original && !!version && <>Bản {version} · </>}
                {photos.filter((photo) => photo.available).length} ảnh
              </p>
              <p>
                {original
                  ? canRequest
                    ? 'Mở từng ảnh để chọn retouch và ghi chú yêu cầu chỉnh sửa.'
                    : replacementByOriginal.size > 0
                      ? 'Bản chỉnh đã bàn giao xuất hiện tại vị trí của ảnh gốc.'
                      : 'Ảnh gốc được đồng bộ từ Google Drive.'
                  : 'Mở từng ảnh để xem lớn hoặc tải ảnh về máy.'}
              </p>
            </div>
            <span className="customer-drive-album__status">
              {conceptStatus[album.status] || album.status}
            </span>
          </div>

          <div className="customer-drive-album__toolbar">
            <div className="customer-drive-album__filters" role="group" aria-label="Lọc ảnh">
              <button
                type="button"
                aria-pressed={!annotatedOnly}
                onClick={() => {
                  setAnnotatedOnly(false);
                  setShown(pageSize);
                }}
              >
                Tất cả ({photos.length})
              </button>
              {original && (
                <button
                  type="button"
                  aria-pressed={annotatedOnly}
                  onClick={() => {
                    setAnnotatedOnly(true);
                    setShown(pageSize);
                  }}
                >
                  Đã chọn ({selectedPhotos.length})
                </button>
              )}
            </div>
          </div>

          <div className="customer-drive-album__grid" role="group" aria-label="Danh sách ảnh">
            {Array.from(
              { length: Math.ceil(Math.min(shown, filtered.length) / columns) },
              (_, rowIdx) => {
                const start = rowIdx * columns;
                const row = filtered.slice(start, Math.min(start + columns, shown));
                const weights = Array.from({ length: columns }, (_, col) =>
                  row[col] ? ratioOf(row[col]) : fallbackRatio,
                );
                const sum = weights.reduce((total, weight) => total + weight, 0);
                const gridTemplateColumns = weights
                  .map((weight) => `minmax(0, ${(weight / sum) * columns}fr)`)
                  .join(' ');
                return (
                  <ul
                    key={row[0].id}
                    className="customer-drive-album__row"
                    style={{ gridTemplateColumns }}
                  >
                    {row.map((photo) => {
                      const display = replacementByOriginal.get(photo.id) ?? photo;
                      const isReplaced = replacementByOriginal.has(photo.id);
                      const isSelected = !!photo.selected;
                      return (
                        <li key={photo.id}>
                          <button
                            type="button"
                            className="customer-drive-album__photo"
                            style={{ '--photo-ratio': ratioOf(photo) } as CSSProperties}
                            aria-label={`Xem ${photo.name}`}
                            onClick={() => setActiveId(photo.id)}
                            onLoadCapture={(event) => measureImage(photo, event)}
                          >
                            <ConceptPhotoImage
                              orderId={orderId}
                              photo={display}
                              thumbnail
                              thumbnailCache={thumbnailCache}
                            />
                          </button>
                          <div className="customer-drive-album__caption">
                            <span className="customer-drive-album__filename" title={photo.name}>
                              {photo.name}
                            </span>
                            {original && (isReplaced || canRequest || isSelected) && (
                              <button
                                type="button"
                                className={`customer-drive-album__request-link${isSelected ? ' has-note' : ''}`}
                                onClick={() => setActiveId(photo.id)}
                              >
                                {isReplaced ? (
                                  <>
                                    <Check size={15} aria-hidden="true" /> Đã chỉnh
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare size={15} aria-hidden="true" />{' '}
                                    {isSelected ? 'Đã chọn' : 'Chọn retouch'}
                                  </>
                                )}
                              </button>
                            )}
                            {!original && album.allowDownload && (
                              <button
                                type="button"
                                className="customer-drive-album__request-link"
                                onClick={() => onDownload(photo)}
                              >
                                <Download size={14} aria-hidden="true" /> Tải
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              },
            )}
          </div>

          {!filtered.length && (
            <p className="customer-drive-album__empty">
              {annotatedOnly ? 'Chưa có ảnh nào được chọn retouch.' : 'Chưa có ảnh trong album.'}
            </p>
          )}
          {filtered.length > shown && (
            <CustomerButton
              type="button"
              variant="secondary"
              onClick={() => setShown((count) => count + pageSize)}
            >
              Xem thêm ảnh ({filtered.length - shown})
            </CustomerButton>
          )}

          {canRequest && (
            <footer className="customer-drive-album__send">
              <div className="customer-drive-album__width">
                <div className="customer-drive-album__send-summary">
                  <span>
                    <MessageSquare size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <strong aria-live="polite">
                      {selectedPhotos.length}/{order.snapshot.retouchQuota} ảnh đã chọn
                    </strong>
                    <p>Phí thêm: {money(extraFee)}</p>
                  </div>
                </div>
                <Dialog
                  open={confirm}
                  onOpenChange={(open) => {
                    if (!busy) setConfirm(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <CustomerButton type="button" disabled={busy || !selectedPhotos.length}>
                      Chốt ảnh retouch
                    </CustomerButton>
                  </DialogTrigger>
                  <DialogContent className="customer-tokens customer-drive-album__confirm">
                    <DialogTitle>Chốt {selectedPhotos.length} ảnh để retouch?</DialogTitle>
                    <DialogDescription>
                      Phí ảnh thêm: {money(extraFee)}. Sau khi chốt, studio sẽ bắt đầu hậu kỳ.
                    </DialogDescription>
                    <label className="concept-check text-sm">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      Tôi chốt danh sách và đồng ý phí ảnh thêm {money(extraFee)}.
                    </label>
                    <div className="customer-drive-album__confirm-actions">
                      <CustomerButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setConfirm(false)}
                      >
                        Xem lại
                      </CustomerButton>
                      <CustomerButton
                        type="button"
                        disabled={busy || !consent || !selectedPhotos.length}
                        onClick={async () => {
                          if (await onCommand('finalize', { accepted: true })) setConfirm(false);
                        }}
                      >
                        Xác nhận chốt ảnh
                      </CustomerButton>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </footer>
          )}
        </div>

        {active && (
          <section
            className="customer-drive-album__viewer"
            aria-label={original ? 'Xem ảnh gốc' : 'Xem ảnh đã chỉnh'}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setActiveId('');
              }
              if (event.target instanceof HTMLTextAreaElement) return;
              if (event.key === 'ArrowLeft' && activeIndex > 0)
                setActiveId(viewPhotos[activeIndex - 1].id);
              if (event.key === 'ArrowRight' && activeIndex < viewPhotos.length - 1)
                setActiveId(viewPhotos[activeIndex + 1].id);
            }}
          >
            <CustomerButton
              type="button"
              variant="text"
              className="app-back-link customer-drive-album__back"
              onClick={() => setActiveId('')}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Quay lại album
            </CustomerButton>
            <header className="customer-drive-album__viewer-heading">
              <div>
                <h2>{original && !replacementByOriginal.has(active.id) ? 'Ảnh gốc' : 'Ảnh đã chỉnh'}</h2>
                <p className="customer-drive-album__meta">
                  {album.title}
                  {!original && ` · Bản ${version}`}
                </p>
              </div>
              {!original && album.allowDownload && (
                <CustomerButton
                  type="button"
                  variant="secondary"
                  onClick={() => onDownload(active)}
                >
                  <Download size={17} aria-hidden="true" /> Tải ảnh
                </CustomerButton>
              )}
            </header>
            <div className="customer-drive-album__viewer-layout">
              <div className="customer-drive-album__viewer-photos">
                <div className="customer-drive-album__stage">
                  <ConceptPhotoImage
                    key={active.id}
                    orderId={orderId}
                    photo={replacementByOriginal.get(active.id) ?? active}
                  />
                  <button
                    type="button"
                    className="customer-drive-album__previous"
                    aria-label="Ảnh trước"
                    disabled={activeIndex <= 0}
                    onClick={() => setActiveId(viewPhotos[activeIndex - 1].id)}
                  >
                    <ChevronLeft size={21} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="customer-drive-album__next"
                    aria-label="Ảnh tiếp theo"
                    disabled={activeIndex >= viewPhotos.length - 1}
                    onClick={() => setActiveId(viewPhotos[activeIndex + 1].id)}
                  >
                    <ChevronRight size={21} aria-hidden="true" />
                  </button>
                </div>
                <div className="customer-drive-album__position">
                  <strong>{active.name}</strong>
                  <span aria-live="polite">
                    Ảnh {activeIndex + 1} / {viewPhotos.length}
                  </span>
                </div>
                {viewPhotos.length > 1 && (
                  <nav className="customer-drive-album__strip" aria-label="Chuyển ảnh">
                    {viewPhotos.slice(stripStart, stripStart + stripSize).map((photo) => (
                      <button
                        type="button"
                        key={photo.id}
                        aria-current={photo.id === active.id || undefined}
                        aria-label={`Xem ${photo.name}`}
                        onClick={() => setActiveId(photo.id)}
                      >
                        <ConceptPhotoImage
                          orderId={orderId}
                          photo={replacementByOriginal.get(photo.id) ?? photo}
                          thumbnail
                          thumbnailCache={thumbnailCache}
                        />
                        {photo.selected && (
                          <span>
                            <MessageSquare size={13} aria-hidden="true" />
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
              {original && (
                <aside className="customer-drive-album__feedback">
                  <h2>Yêu cầu retouch</h2>
                  <p className="customer-drive-album__meta">{active.name}</p>
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const ok = await onCommand('photo', {
                        photoId: active.id,
                        note: note.trim(),
                        ...(!active.selected ? { selected: true } : {}),
                      });
                      if (ok) {
                        setDrafts((current) => {
                          const next = { ...current };
                          delete next[active.id];
                          return next;
                        });
                      }
                    }}
                  >
                    <label htmlFor={noteId}>Ghi chú cho studio</label>
                    <CustomerTextarea
                      id={noteId}
                      readOnly={!canRequest}
                      value={note}
                      rows={5}
                      maxLength={noteLimit}
                      placeholder={
                        canRequest ? 'Ví dụ: Nhờ studio tăng sáng nhẹ phần mặt.' : 'Chưa có ghi chú.'
                      }
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [active.id]: event.target.value }))
                      }
                    />
                    <div className="customer-drive-album__note-status">
                      <span role="status">
                        {dirty ? 'Chưa lưu' : active.selected ? 'Đã chọn retouch' : ''}
                      </span>
                      <span>{note.length.toLocaleString('vi-VN')} / 2.000</span>
                    </div>
                    {canRequest && (
                      <CustomerButton type="submit" fullWidth disabled={busy || (!dirty && !!active.selected)}>
                        {active.selected ? 'Lưu thay đổi' : 'Chọn ảnh này'}
                      </CustomerButton>
                    )}
                    {canRequest && active.selected && (
                      <CustomerButton
                        type="button"
                        variant="text"
                        fullWidth
                        disabled={busy}
                        onClick={() =>
                          void onCommand('photo', { photoId: active.id, note: '', selected: false })
                        }
                      >
                        Bỏ chọn
                      </CustomerButton>
                    )}
                  </form>
                </aside>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function ConceptDeliveryPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const requestedVersion = Number(new URLSearchParams(location.search).get('version')) || 0;
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const { user } = useAuth();
  const customer = useCustomerAppearance();
  const [order, setOrder] = useState<ConceptOrder | null>(null);
  const [album, setAlbum] = useState<ConceptAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [photoSection, setPhotoSection] = useState<'selection' | 'delivery'>('delivery');
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextOrder = await conceptService.order(id);
      setOrder(nextOrder);
      try {
        const nextAlbum = await conceptService.album(id);
        setAlbum(nextAlbum);
        setSelectedVersion(requestedVersion || nextAlbum.deliveryVersion || 0);
        const hasOriginals = nextAlbum.photos.some((p) => p.version === 0);
        if (requestedTab === 'selection') setPhotoSection('selection');
        else if (requestedTab === 'delivery') setPhotoSection('delivery');
        else if (nextAlbum.deliveryVersion > 0) setPhotoSection('delivery');
        else setPhotoSection(hasOriginals ? 'selection' : 'delivery');
      } catch (err) {
        if ((err as { response?: { status?: number } }).response?.status === 404) {
          setAlbum(null);
        } else {
          setError(conceptError(err));
        }
      }
    } catch (err) {
      setError(conceptError(err));
    } finally {
      setLoading(false);
    }
  }, [id, requestedTab, requestedVersion]);

  useEffect(() => {
    void load();
  }, [load, user?._id]);

  const command = async (operation: string, body: Record<string, unknown> = {}) => {
    if (!album || busy) return false;
    setBusy(true);
    setError('');
    setNotice('');
    const payload = { ...body, expectedVersion: album.version };
    const signature = JSON.stringify({ operation, ...payload });
    if (retry.current?.signature !== signature) {
      retry.current = { signature, key: crypto.randomUUID() };
    }
    try {
      const next = await conceptService.albumCommand(id, operation, payload, retry.current.key);
      if ('backgroundOperation' in next) {
        await load();
        return true;
      }
      setAlbum(next);
      retry.current = null;
      const updatedOrder = await conceptService.order(id);
      setOrder(updatedOrder);
      if (operation === 'feedback' || operation === 'request-extra') {
        setGeneralFeedback('');
        setNotice('Đã gửi phản hồi cho studio. Ekip sẽ kiểm tra và cập nhật bản chỉnh sửa.');
      } else if (operation === 'accept') {
        setNotice('Đã xác nhận ảnh đạt yêu cầu. Cảm ơn bạn!');
      } else if (operation === 'finalize') {
        setNotice('Đã chốt danh sách ảnh retouch.');
      } else {
        setNotice('Đã lưu.');
      }
      return true;
    } catch (err) {
      setError(conceptError(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const back = customer ? `/account/concept-orders/${id}` : `/concept-orders/${id}`;
  const latest = album?.deliveryVersion || 0;
  const deliveries = [...(album?.deliveries || [])].sort((a, b) => b.version - a.version);
  const version =
    deliveries.some((d) => d.version === selectedVersion) || selectedVersion === latest
      ? selectedVersion
      : latest;
  const selectedDelivery = deliveries.find((d) => d.version === version);
  const selectionPhotos = album?.photos.filter((p) => p.version === 0) || [];
  const hasReplacements = !!album?.replacements?.some((p) => p.version > 0);
  const replacementByOriginal = new Map(
    (album?.replacements || [])
      .filter((p) => p.version > 0)
      .map((p) => [p.originalPhotoId || '', p] as const),
  );
  const deliveryPhotos = album?.photos.filter((p) => p.version === version && version > 0) || [];
  const driveDeliveryPhotos = deliveryPhotos.filter((p) => p.source !== 'local');
  const localDeliveryPhotos = deliveryPhotos.filter((p) => p.source === 'local');
  const canRespond =
    customer &&
    order?.isOwner &&
    !!album &&
    ['delivered', 'completed'].includes(album.status) &&
    version === latest;

  const labelForPhoto = (photoId?: string) => {
    if (!photoId || photoId === 'general') return 'Phản hồi chung về bộ ảnh';
    return album?.photos.find((p) => p.id === photoId)?.name || 'Ảnh bàn giao';
  };

  if (!customer && order) {
    return (
      <div className="delivery-page">
        <div className="delivery-page__toolbar">
          <Link className="app-back-link text-primary" to={back} state={location.state}>
            <ArrowLeft size={16} aria-hidden="true" /> Quay lại hồ sơ đơn
          </Link>
        </div>
        <header className="delivery-page__heading">
          <div>
            <h1 className="text-2xl font-bold">Album bàn giao</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {order.snapshot.conceptName} · {order.snapshot.name}
            </p>
          </div>
        </header>
        <ConceptDeliveryWorkspace
          order={order}
          requestedTab={requestedTab}
          requestedVersion={requestedVersion}
          onOrderChange={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="delivery-page">
      <div className="delivery-page__toolbar">
        <Link
          className={customer ? 'customer-back-link' : 'app-back-link text-primary'}
          to={back}
          state={location.state}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại hồ sơ đơn
        </Link>
      </div>
      {loading ? (
        <p role="status">Đang tải ảnh bàn giao…</p>
      ) : !order ? (
        <p role="alert">{error || 'Không tìm thấy bản bàn giao.'}</p>
      ) : (
        <>
          <header className="delivery-page__heading">
            <div>
              <h1 className={customer ? 'customer-page-title' : 'text-2xl font-bold'}>
                Album bàn giao
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {order.snapshot.name}
                {photoSection === 'delivery' && deliveryPhotos.length
                  ? ` · ${deliveryPhotos.length} ảnh`
                  : selectionPhotos.length && photoSection === 'selection'
                    ? ` · ${selectionPhotos.length} ảnh`
                    : ''}
                {selectedDelivery?.at &&
                  ` · Bàn giao ${new Date(selectedDelivery.at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`}
              </p>
            </div>
            {!!latest && photoSection === 'delivery' && (
              <label className="delivery-page__version">
                <span className="sr-only">Phiên bản ảnh</span>
                <OrderSelect
                  value={version}
                  disabled={busy}
                  onChange={(event) => setSelectedVersion(Number(event.target.value))}
                >
                  {deliveries.map((item) => (
                    <option key={item.version} value={item.version}>
                      Bản bàn giao {item.version}
                      {item.version !== latest ? ' — bản cũ' : ''}
                    </option>
                  ))}
                </OrderSelect>
              </label>
            )}
          </header>
          <div
            className={`delivery-page__tabs${customer ? ' delivery-page__tabs--customer' : ''}`}
            role="tablist"
            aria-label="Các phần album"
          >
            <button
              id="concept-selection-tab"
              type="button"
              role="tab"
              aria-selected={photoSection === 'selection'}
              aria-controls="concept-delivery-content"
              onClick={() => setPhotoSection('selection')}
            >
              {hasReplacements ? 'Album ảnh' : 'Ảnh gốc'}
            </button>
            <button
              id="concept-edited-tab"
              type="button"
              role="tab"
              aria-selected={photoSection === 'delivery'}
              aria-controls="concept-delivery-content"
              onClick={() => setPhotoSection('delivery')}
            >
              Ảnh đã chỉnh
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}
          <div id="concept-delivery-content" role="tabpanel" className="delivery-page__layout">
            <section className="delivery-page__album" aria-label="Album ảnh bàn giao">
              {!album ? (
                <div className="delivery-page__panel">
                  Album chưa được mở. Hoàn tất thanh toán phần còn lại hoặc chờ studio cập nhật ảnh.
                </div>
              ) : photoSection === 'selection' ? (
                selectionPhotos.length ? (
                  <ConceptDriveGallery
                    orderId={id}
                    order={order}
                    album={album}
                    original
                    version={0}
                    photos={selectionPhotos}
                    replacementByOriginal={replacementByOriginal}
                    busy={busy}
                    onCommand={command}
                    onDownload={async (photo) => {
                      try {
                        saveBlob(
                          await conceptService.image(id, photo.id, { download: true }),
                          photo.name,
                        );
                      } catch (err) {
                        setError(conceptError(err));
                      }
                    }}
                  />
                ) : (
                  <div className="delivery-page__panel">
                    Studio giao trực tiếp ảnh đã chỉnh ở tab Ảnh đã chỉnh.
                  </div>
                )
              ) : !latest || !deliveryPhotos.length ? (
                <div className="delivery-page__panel">
                  Studio chưa bàn giao ảnh. Vui lòng quay lại sau.
                </div>
              ) : (
                <div className="space-y-4">
                  {album.allowDownload && (
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        try {
                          saveBlob(
                            await conceptService.zip(id, version),
                            `concept-v${version}.zip`,
                          );
                        } catch (err) {
                          setError(conceptError(err));
                        }
                      }}
                    >
                      <Download size={16} aria-hidden="true" /> Tải toàn bộ bản v{version} (ZIP)
                    </Button>
                  )}
                  {!!localDeliveryPhotos.length && (
                    <ConceptLocalGallery
                      key={`${id}:${version}`}
                      orderId={id}
                      photos={localDeliveryPhotos}
                      allowDownload={album.allowDownload}
                      onDownload={async (photo: ConceptPhoto) => {
                        try {
                          saveBlob(
                            await conceptService.deliveryImage(id, photo.id, { download: true }),
                            photo.name,
                          );
                        } catch (err) {
                          setError(conceptError(err));
                        }
                      }}
                    />
                  )}
                  {!!driveDeliveryPhotos.length && (
                    <ConceptDriveGallery
                      orderId={id}
                      order={order}
                      album={album}
                      original={false}
                      version={version}
                      photos={driveDeliveryPhotos}
                      replacementByOriginal={new Map()}
                      busy={busy}
                      onCommand={command}
                      onDownload={async (photo) => {
                        try {
                          saveBlob(
                            await conceptService.image(id, photo.id, { download: true }),
                            photo.name,
                          );
                        } catch (err) {
                          setError(conceptError(err));
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </section>
            {photoSection === 'delivery' && !!latest && !!deliveryPhotos.length && (
              <aside
                className="delivery-page__feedback space-y-4"
                aria-labelledby="concept-delivery-feedback-title"
              >
                <h2 id="concept-delivery-feedback-title">Phản hồi về bộ ảnh</h2>
                {version !== latest ? (
                  <p className="text-sm">
                    Bạn đang xem bản cũ. Chọn bản mới nhất để gửi phản hồi hoặc xác nhận ảnh đạt yêu
                    cầu.
                  </p>
                ) : canRespond && (album?.status === 'delivered' || album?.status === 'completed') ? (
                  <>
                    <form
                      className="delivery-page__feedback-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!generalFeedback.trim()) return;
                        const op =
                          album.freeRoundsUsed < 2 && album.status === 'delivered'
                            ? 'feedback'
                            : 'request-extra';
                        void command(op, {
                          deliveryVersion: latest,
                          items: [{ photoId: 'general', note: generalFeedback.trim() }],
                        });
                      }}
                    >
                      <p className="text-sm text-muted-foreground">
                        {album.freeRoundsUsed < 2 && album.status === 'delivered'
                          ? `Còn ${2 - album.freeRoundsUsed}/2 vòng phản hồi miễn phí cho bản sau hậu kỳ.`
                          : 'Đã hết vòng miễn phí. Gửi yêu cầu chỉnh thêm có phí để studio báo giá.'}
                      </p>
                      <label htmlFor="concept-delivery-feedback" className="text-sm font-medium">
                        Nội dung phản hồi
                      </label>
                      <OrderTextarea
                        id="concept-delivery-feedback"
                        rows={5}
                        maxLength={2000}
                        required
                        value={generalFeedback}
                        disabled={busy}
                        onChange={(event) => setGeneralFeedback(event.target.value)}
                      />
                      <Button
                        type="submit"
                        className="delivery-page__submit"
                        disabled={busy || !generalFeedback.trim()}
                      >
                        <Send size={18} aria-hidden="true" />{' '}
                        {album.freeRoundsUsed < 2 && album.status === 'delivered'
                          ? 'Gửi phản hồi'
                          : 'Yêu cầu báo phí chỉnh thêm'}
                      </Button>
                    </form>
                    {album.status === 'delivered' && (
                      <div className="delivery-page__accept">
                        <h3>Bạn đã hài lòng với bộ ảnh?</h3>
                        <p>
                          Chỉ xác nhận khi bạn đã xem và hài lòng với toàn bộ ảnh trong bản bàn giao
                          này.
                        </p>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => void command('accept', { deliveryVersion: latest })}
                        >
                          <CheckCircle2 size={21} aria-hidden="true" /> Xác nhận ảnh đã đạt yêu cầu
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm">
                    {album?.status === 'revising'
                      ? 'Studio đang xử lý phản hồi và chỉnh sửa ảnh. Bạn vẫn có thể xem bản đã gửi.'
                      : album?.status === 'completed'
                        ? 'Bạn đã xác nhận ảnh trong bản bàn giao này đạt yêu cầu.'
                        : 'Hiện chưa thể gửi phản hồi cho bản bàn giao này.'}
                  </p>
                )}
                {!!album?.feedbackRounds?.length && (
                  <section className="border-t pt-4 space-y-3">
                    <h3 className="font-semibold">Phản hồi đã gửi</h3>
                    <ul className="space-y-3">
                      {album.feedbackRounds
                        .filter((round) => round.version === version)
                        .map((round) =>
                          round.items.map((item, idx) => (
                            <li key={`${round.id}-${idx}`} className="text-sm">
                              <p className="whitespace-pre-wrap">
                                <strong>{labelForPhoto(item.photoId)}:</strong> {item.note}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                Vòng {round.round} · Bản {round.version} · {vnTime(round.at)} ·{' '}
                                {item.resolved ? 'Đã xử lý' : 'Đang chờ studio'}
                              </p>
                            </li>
                          )),
                        )}
                    </ul>
                  </section>
                )}
                {!!album?.paidRequests?.length && (
                  <section className="border-t pt-4 space-y-3">
                    <h3 className="font-semibold">Yêu cầu chỉnh thêm có phí</h3>
                    {album.paidRequests.map((reqItem) => (
                      <div key={reqItem.id} className="text-sm space-y-2 border-t pt-2">
                        {reqItem.items.map((item, idx) => (
                          <p key={idx}>
                            <strong>{labelForPhoto(item.photoId)}:</strong> {item.note}
                          </p>
                        ))}
                        {reqItem.amount && (
                          <p>
                            Phí: <strong>{money(reqItem.amount)}</strong> · {reqItem.terms}
                          </p>
                        )}
                        {order.isOwner && reqItem.status === 'quoted' && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                void command('accept-quote', {
                                  requestId: reqItem.id,
                                  accepted: true,
                                  amount: reqItem.amount,
                                })
                              }
                            >
                              Đồng ý báo giá và tạo QR
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void command('decline-quote', { requestId: reqItem.id })
                              }
                            >
                              Hủy yêu cầu
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
