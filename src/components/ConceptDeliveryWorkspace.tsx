import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type UIEvent,
} from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, ImageIcon } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Textarea,
} from '@/components/ui';
import {
  ConceptLocalGallery,
  ConceptLocalUpload,
  ConceptPhotoImage,
  ConceptReplacementUpload,
} from './ConceptAlbumMedia';
import { useAlbumOperation } from '@/hooks/useAlbumOperation';
import { isQueuedAlbum } from '@/services/backgroundJobService';
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
import '../styles/photographer-delivery.css';

const steps = [
  { id: 'album', label: 'Album ảnh gốc' },
  { id: 'selection', label: 'Yêu cầu chỉnh ảnh' },
  { id: 'edited', label: 'Ảnh đã chỉnh' },
  { id: 'review', label: 'Nghiệm thu' },
] as const;

type Step = (typeof steps)[number]['id'];

const splitFolders = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function DeliveryHeading({
  title,
  badge,
  tone,
}: {
  title: string;
  badge?: string;
  tone?: 'success' | 'info' | 'warning';
}) {
  return (
    <div className="photographer-delivery__heading">
      <h2>{title}</h2>
      {badge && (
        <span className="photographer-delivery__badge" data-tone={tone}>
          {badge}
        </span>
      )}
    </div>
  );
}

const photosPerRow = 3;
const rowsPerWindow = 3;
const defaultPhotoRatio = 4 / 3;
const photosPerWindow = photosPerRow * rowsPerWindow;
const photoBatchSize = photosPerWindow * 2;

function DrivePreview({
  orderId,
  photos,
  onCover,
  coverId,
  rows = false,
  details,
}: {
  orderId: string;
  photos: ConceptPhoto[];
  onCover?: (photo: ConceptPhoto) => void;
  coverId?: string;
  rows?: boolean;
  details?: (photo: ConceptPhoto) => ReactNode;
}) {
  const [limit, setLimit] = useState(photoBatchSize);
  const [photoId, setPhotoId] = useState('');
  const [fullUrl, setFullUrl] = useState('');
  const [loadedRatios, setLoadedRatios] = useState<Record<string, number>>({});
  const scrollFrame = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = scrollFrame.current;
    const gallery = frame?.firstElementChild;
    const lastVisibleRow = gallery?.children[rowsPerWindow - 1];
    if (rows || !frame || !gallery || !lastVisibleRow) {
      frame?.style.removeProperty('--photo-window-height');
      return;
    }

    const measure = () => {
      const bounds = gallery.getBoundingClientRect();
      if (bounds.width) {
        const height = `${Math.ceil(lastVisibleRow.getBoundingClientRect().bottom - bounds.top)}px`;
        if (frame.style.getPropertyValue('--photo-window-height') !== height)
          frame.style.setProperty('--photo-window-height', height);
      }
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer) {
      observer.observe(gallery);
      for (const row of Array.from(gallery.children).slice(0, rowsPerWindow)) {
        observer.observe(row);
      }
    }
    return () => observer?.disconnect();
  }, [photos, rows]);

  const index = photos.findIndex((photo) => photo.id === photoId);
  const active = photos[index];
  const open = (id: string) => {
    setFullUrl('');
    setPhotoId(id);
  };
  const loadOnScroll = ({ currentTarget }: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = currentTarget;
    if (scrollHeight - scrollTop - clientHeight < clientHeight / 2) {
      setLimit((count) => Math.min(count + photoBatchSize, photos.length));
    }
  };

  if (!photos.length) return null;
  const visible = photos.slice(0, limit);
  const imageKey = (photo: ConceptPhoto) => `${photo.id}:${photo.sourceVersion ?? ''}`;
  const photoRatio = (photo: ConceptPhoto) => {
    const ratio = photo.width / photo.height;
    const reserved = ratio > 0 && Number.isFinite(ratio) ? ratio : defaultPhotoRatio;
    return loadedRatios[imageKey(photo)] ?? reserved;
  };

  const renderPhoto = (photo: ConceptPhoto, ratio?: number) => (
    <li key={photo.id}>
      <div
        className="photographer-delivery__thumb"
        style={ratio ? ({ '--photo-ratio': ratio } as CSSProperties) : undefined}
        onLoadCapture={
          ratio
            ? ({ target }) => {
                if (!(target instanceof HTMLImageElement) || !target.naturalHeight) return;
                const loadedRatio = target.naturalWidth / target.naturalHeight;
                if (loadedRatio > 0 && loadedRatio !== ratio) {
                  setLoadedRatios((current) => ({ ...current, [imageKey(photo)]: loadedRatio }));
                }
              }
            : undefined
        }
      >
        <button type="button" aria-label={`Xem ${photo.name}`} onClick={() => open(photo.id)}>
          <ConceptPhotoImage orderId={orderId} photo={photo} thumbnail />
        </button>
        {photo.driveId && photo.driveId === coverId && <span>Ảnh bìa</span>}
      </div>
      <div className="photographer-delivery__caption">
        <span title={photo.name}>{photo.name}</span>
        {photo.note && <p>{photo.note}</p>}
        {details?.(photo)}
        {onCover && photo.available && photo.driveId && photo.driveId !== coverId && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onCover(photo)}>
            Đặt làm ảnh bìa<span className="sr-only"> {photo.name}</span>
          </Button>
        )}
      </div>
    </li>
  );

  return (
    <>
      <div
        ref={scrollFrame}
        className={`photographer-delivery__photo-scroll${rows ? '' : ' photographer-delivery__photo-scroll--grid'}`}
        role="region"
        aria-label="Khung cuộn ảnh"
        tabIndex={0}
        onScroll={limit < photos.length ? loadOnScroll : undefined}
      >
        {rows ? (
          <ul className="photographer-delivery__photo-rows" aria-label="Danh sách ảnh">
            {visible.map((photo) => renderPhoto(photo))}
          </ul>
        ) : (
          <div className="photographer-delivery__gallery" role="group" aria-label="Danh sách ảnh">
            {Array.from({ length: Math.ceil(visible.length / photosPerRow) }, (_, rowIdx) => {
              const start = rowIdx * photosPerRow;
              const row = visible.slice(start, start + photosPerRow);
              const ratios = row.map(photoRatio);
              const gridTemplateColumns = Array.from(
                { length: photosPerRow },
                (_, column) => `minmax(0, ${ratios[column] ?? defaultPhotoRatio}fr)`,
              ).join(' ');
              return (
                <ul
                  className="photographer-delivery__gallery-row"
                  key={row[0].id}
                  style={{ gridTemplateColumns }}
                >
                  {row.map((photo, column) => renderPhoto(photo, ratios[column]))}
                </ul>
              );
            })}
          </div>
        )}
      </div>
      <Dialog
        open={!!active}
        onOpenChange={(isOpen) => {
          if (!isOpen) open('');
        }}
      >
        {active && (
          <DialogContent className="photographer-delivery__viewer">
            <DialogTitle>{active.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Ảnh {index + 1} trên {photos.length}
            </DialogDescription>
            <ConceptPhotoImage
              key={active.id}
              orderId={orderId}
              photo={active}
              onUrl={setFullUrl}
            />
            {active.note && (
              <p className="whitespace-pre-wrap break-words text-sm">{active.note}</p>
            )}
            <div className="photographer-delivery__actions">
              <Button
                type="button"
                variant="outline"
                aria-label="Ảnh trước"
                disabled={index === 0}
                onClick={() => open(photos[index - 1].id)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label="Ảnh tiếp"
                disabled={index === photos.length - 1}
                onClick={() => open(photos[index + 1].id)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
              {fullUrl && (
                <Button asChild variant="outline">
                  <a href={fullUrl} download={active.name}>
                    <Download aria-hidden="true" /> Tải ảnh
                  </a>
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export function ConceptDeliveryWorkspace({
  order,
  requestedTab,
  requestedVersion = 0,
  reloadCount = 0,
  onOrderChange,
}: {
  order: ConceptOrder;
  requestedTab?: string | null;
  requestedVersion?: number;
  reloadCount?: number;
  onOrderChange: () => void;
}) {
  const id = order._id;
  const panelId = useId();
  const formId = useId();
  const [album, setAlbum] = useState<ConceptAlbum | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stepOverride, setStep] = useState<Step>();
  const [editingSource, setEditingSource] = useState<Step>();
  const [title, setTitle] = useState(order.snapshot.name);
  const [limit, setLimit] = useState(String(order.snapshot.retouchQuota || 0));
  const [folders, setFolders] = useState('');
  const [editedFolders, setEditedFolders] = useState('');
  const [uploadOpen, setUploadOpen] = useState(true);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadIds, setUploadIds] = useState<string[]>([]);
  const [replacementTarget, setReplacementTarget] = useState<ConceptPhoto>();
  const replacementTrigger = useRef<HTMLButtonElement>();
  const [versionOverride, setVersion] = useState(requestedVersion);
  const [viewVersion, setViewVersion] = useState(!!requestedVersion);
  const [extension, setExtension] = useState(false);
  const [exportText, setExportText] = useState('');
  const [share, setShare] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [quotes, setQuotes] = useState<Record<string, { amount: string; terms: string }>>({});
  const retry = useRef<{ signature: string; key: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await conceptService.album(id);
      setAlbum(next);
      setTitle(next.title || order.snapshot.name);
      setLimit(String(next.limit ?? order.snapshot.retouchQuota ?? 0));
      setFolders((next.folders || []).join('\n'));
      setError('');
    } catch (err) {
      if ((err as { response?: { status?: number } }).response?.status === 404) {
        setAlbum(null);
        setError('');
      } else {
        setError(conceptError(err));
      }
    } finally {
      setLoaded(true);
    }
  }, [id, order.snapshot.name]);

  useEffect(() => {
    void load();
  }, [load, order.version, reloadCount]);

  const background = useAlbumOperation('concept', id, order.canEdit, async () => {
    await load();
    onOrderChange();
  });
  const busy = saving || background.pending;
  const activeWork = busy || uploadBusy;

  const command = async (operation: string, body: Record<string, unknown> = {}) => {
    if (background.pending || saving) return false;
    setSaving(true);
    setError('');
    setNotice('');
    const payload = { ...body, expectedVersion: album?.version || 0 };
    const signature = JSON.stringify({ operation, ...payload });
    if (retry.current?.signature !== signature) {
      retry.current = { signature, key: crypto.randomUUID() };
    }
    try {
      const result = await conceptService.albumCommand(id, operation, payload, retry.current.key);
      if (isQueuedAlbum(result)) {
        background.watch(result.backgroundOperation);
        retry.current = null;
        return true;
      }
      setAlbum(result);
      setTitle(result.title || order.snapshot.name);
      if (result.folders?.length) setFolders(result.folders.join('\n'));
      retry.current = null;
      if (result.token && result.share?.publicId) {
        setShare(
          `${window.location.origin}/concept-albums/${result.share.publicId}#access=${result.token}`,
        );
      }
      setEditingSource(undefined);
      onOrderChange();
      if (operation === 'deliver') {
        setEditedFolders('');
        setUploadIds([]);
        setVersion(0);
        setViewVersion(true);
        setStep('review');
        setNotice('Đã gửi bản bàn giao mới.');
      } else if (operation === 'publish') {
        setStep('selection');
        setNotice('Đã mở album cho khách chọn ảnh.');
      } else if (operation === 'sync') {
        setNotice('Đã đồng bộ ảnh từ Drive.');
      } else if (operation === 'delivery-sync') {
        setNotice('Đã lấy ảnh chỉnh sửa vào bản nháp.');
      } else {
        setNotice('Đã lưu.');
      }
      return true;
    } catch (err) {
      setError(conceptError(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const originals = album?.photos.filter((p) => p.version === 0) || [];
  const imported = originals.filter((p) => p.available).length;
  const requests = originals.filter((p) => p.selected);
  const replacementDrafts = album?.replacements?.filter((p) => p.version === -1) || [];
  const draftsByOriginal = new Map(
    replacementDrafts.map((p) => [p.originalPhotoId || '', p] as const),
  );
  const updatedOriginals = new Set(
    album?.replacements?.filter((p) => p.version > 0).map((p) => p.originalPhotoId || ''),
  );
  const preview = album?.photos.filter((p) => p.version === -1) || [];
  const readyCount = preview.filter((p) => p.available).length;
  const showEditedPreview = readyCount > 0 && editingSource !== 'edited';
  const latest = album?.deliveryVersion || 0;
  const published = !!album && album.status !== 'draft';
  const accepted = album?.status === 'completed' || order.status === 'completed';
  const balancePaid = order.paymentRequests?.some((p) => p.kind === 'balance' && p.status === 'paid');
  const needsRevision = album?.status === 'revising';
  const editing =
    !album || ['draft', 'retouching', 'revising', 'queued', 'selecting'].includes(album.status);

  const step: Step =
    stepOverride ??
    (requestedVersion > 0
      ? 'review'
      : requestedTab === 'selection'
        ? published
          ? 'selection'
          : 'album'
        : needsRevision || (latest > 0 && album?.status !== 'retouching')
          ? 'review'
          : requestedTab === 'delivery' || replacementDrafts.length || readyCount
            ? 'edited'
            : published
              ? 'selection'
              : 'album');

  const done = {
    album: published,
    selection: !!album?.selections?.length,
    edited: latest > 0,
    review: accepted,
  };

  const deliveries = [...(album?.deliveries || [])].sort((a, b) => b.version - a.version);
  const selectedDelivery =
    deliveries.find((d) => d.version === versionOverride) ?? deliveries[0];
  const deliveryPhotos =
    album?.photos.filter((p) => p.version === selectedDelivery?.version) || [];
  const driveDeliveryPhotos = deliveryPhotos.filter((p) => p.source !== 'local');
  const localDeliveryPhotos = deliveryPhotos.filter((p) => p.source === 'local');
  const feedbackRounds = (album?.feedbackRounds || []).filter(
    (r) => r.version === selectedDelivery?.version,
  );
  const paidRequests = (album?.paidRequests || []).filter(
    (r) => r.version === selectedDelivery?.version,
  );

  const exportNames = (roundNumber?: number) => {
    const names = roundNumber
      ? album?.selections
          .find((s) => s.round === roundNumber)
          ?.photos.map((p) => p.name) || []
      : requests.filter((p) => p.available).map((p) => p.name);
    const output = names
      .map((name) => (extension ? name : name.replace(/\.[^.]+$/, '')))
      .join('\n');
    setExportText(output);
  };

  const labelForPhoto = (photoId?: string) => {
    if (!photoId || photoId === 'general') return 'Phản hồi chung bộ ảnh';
    return album?.photos.find((p) => p.id === photoId)?.name || 'Ảnh bàn giao';
  };

  let panel: ReactNode;
  if (step === 'album') {
    const showSource = !imported || editingSource === 'album';
    panel = showSource ? (
      <>
        <DeliveryHeading
          title="Chuẩn bị album ảnh gốc"
          badge={imported ? 'Cập nhật nguồn' : 'Chưa đồng bộ'}
        />
        <div className="photographer-delivery__split">
          <form
            className="photographer-delivery__form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const parsed = splitFolders(folders);
              const parsedLimit = Number(limit);
              if (
                !title.trim() ||
                !parsed.length ||
                limit === '' ||
                !Number.isInteger(parsedLimit) ||
                parsedLimit < 0 ||
                parsedLimit > 10000
              ) {
                setError('Kiểm tra tên album, link thư mục Drive và giới hạn từ 0 đến 10.000 ảnh.');
                return;
              }
              void command('sync', { title: title.trim(), folders: parsed, limit: parsedLimit });
            }}
          >
            <label htmlFor={`${formId}-title`}>Tên album</label>
            <Input
              id={`${formId}-title`}
              value={title}
              required
              maxLength={160}
              disabled={busy || (!!album && !['draft', 'selecting'].includes(album.status))}
              onChange={(event) => setTitle(event.target.value)}
            />
            <label htmlFor={`${formId}-folders`}>Thư mục Google Drive</label>
            <div>
              <Textarea
                id={`${formId}-folders`}
                value={folders}
                placeholder="Dán link thư mục ảnh chỉnh màu trên Drive"
                rows={3}
                required
                disabled={busy || (!!album && !['draft', 'selecting'].includes(album.status))}
                aria-describedby={`${formId}-folder-hint`}
                onChange={(event) => setFolders(event.target.value)}
              />
              <p id={`${formId}-folder-hint`} className="photographer-delivery__muted">
                Mỗi link một dòng. Bật quyền xem bằng liên kết trên Drive (tối đa 500 ảnh).
              </p>
            </div>
            <label htmlFor={`${formId}-limit`}>Giới hạn yêu cầu chỉnh sửa</label>
            <div className="photographer-delivery__actions">
              <Input
                id={`${formId}-limit`}
                type="number"
                className="photographer-delivery__limit"
                min={0}
                max={10000}
                value={limit}
                required
                disabled={busy || (!!album && !['draft', 'selecting'].includes(album.status))}
                onChange={(event) => setLimit(event.target.value)}
              />
              <span className="photographer-delivery__muted">
                ảnh · gói có {order.snapshot.retouchQuota} ảnh retouch (0 là không giới hạn)
              </span>
            </div>
            <div className="photographer-delivery__actions photographer-delivery__form-actions">
              <Button
                type="submit"
                disabled={busy || (!!album && !['draft', 'selecting'].includes(album.status))}
              >
                Lưu và lấy ảnh
              </Button>
              {!!imported && (
                <Button type="button" variant="ghost" onClick={() => setEditingSource(undefined)}>
                  Xem ảnh đã lấy
                </Button>
              )}
            </div>
          </form>
          <aside className="photographer-delivery__aside">
            <h3>Ảnh gốc / chỉnh màu</h3>
            <p>Khách sẽ thấy album sau khi bạn xuất bản và thanh toán phần còn lại.</p>
            {!imported && (
              <p>
                Nếu giao ảnh chỉnh sửa trực tiếp không cần Drive chọn ảnh, hãy sang bước{' '}
                <strong>Ảnh đã chỉnh</strong>.
              </p>
            )}
          </aside>
        </div>
      </>
    ) : (
      <>
        <DeliveryHeading
          title="Kiểm tra và mở album"
          badge={`Đã đồng bộ ${imported} ảnh`}
          tone="success"
        />
        <div className="photographer-delivery__line">
          <p className="photographer-delivery__muted">
            {album?.title} · {conceptStatus[album?.status || 'draft']}
          </p>
          <div className="photographer-delivery__actions">
            {album && ['draft', 'selecting'].includes(album.status) && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void command('sync', { title, folders: splitFolders(folders) })}
                >
                  Cập nhật từ Drive
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setEditingSource('album')}
                >
                  Sửa nguồn ảnh
                </Button>
              </>
            )}
          </div>
        </div>
        <DrivePreview
          orderId={id}
          photos={originals}
          coverId={album?.coverId}
          onCover={!busy ? (photo) => void command('cover', { coverId: photo.driveId }) : undefined}
        />
        <footer className="photographer-delivery__footer">
          <p>
            {published
              ? 'Khách đã có thể mở album.'
              : balancePaid
                ? 'Khách chưa xem được album cho đến khi xuất bản.'
                : 'Khách cần thanh toán phần còn lại trước khi mở album.'}
          </p>
          {published ? (
            <Button type="button" variant="outline" onClick={() => setStep('selection')}>
              Xem yêu cầu chỉnh ảnh
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy || !balancePaid}
              onClick={() => void command('publish')}
            >
              Mở album chọn ảnh
            </Button>
          )}
        </footer>
      </>
    );
  } else if (step === 'selection') {
    panel =
      !album || !published ? (
        <>
          <DeliveryHeading title="Yêu cầu chỉnh ảnh" />
          <p className="photographer-delivery__muted">
            Xuất bản album ảnh gốc để khách chọn ảnh retouch, hoặc chuyển sang bước Ảnh đã chỉnh để
            tải ảnh bàn giao trực tiếp.
          </p>
          <div className="photographer-delivery__actions">
            <Button type="button" variant="outline" onClick={() => setStep('album')}>
              Mở bước album ảnh gốc
            </Button>
            <Button type="button" onClick={() => setStep('edited')}>
              Sang bước Ảnh đã chỉnh
            </Button>
          </div>
        </>
      ) : (
        <>
          <DeliveryHeading
            title="Yêu cầu chỉnh ảnh"
            badge={conceptStatus[album.status]}
            tone={album.selections?.length ? 'success' : 'info'}
          />
          <div className="min-w-0">
            {requests.length ? (
              <>
                <p className="photographer-delivery__muted">
                  {requests.length} / {order.snapshot.retouchQuota} ảnh đã chọn
                  {album.extraAmount > 0 ? ` · Phí ảnh thêm ${money(album.extraAmount)}` : ''}
                </p>
                <DrivePreview
                  orderId={id}
                  photos={requests}
                  rows
                  details={(photo) => {
                    const draft = draftsByOriginal.get(photo.id);
                    const sent = updatedOriginals.has(photo.id);
                    const uploadLabel = draft || sent ? 'Tải lại bản chỉnh' : 'Tải bản chỉnh';
                    return (
                      <div className="photographer-delivery__actions mt-2">
                        <span
                          className="photographer-delivery__badge"
                          data-tone={sent && !draft ? 'success' : 'info'}
                        >
                          {draft ? 'Đã tải bản nháp' : sent ? 'Đã bàn giao' : 'Chờ chỉnh'}
                        </span>
                        {order.canEdit &&
                          photo.available &&
                          ['queued', 'retouching', 'revising'].includes(album.status) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={activeWork}
                              aria-label={`${uploadLabel} cho ${photo.name}`}
                              onClick={(event) => {
                                replacementTrigger.current = event.currentTarget;
                                setStep('selection');
                                setReplacementTarget(photo);
                              }}
                            >
                              {uploadLabel}
                            </Button>
                          )}
                      </div>
                    );
                  }}
                />
              </>
            ) : (
              <p className="photographer-delivery__muted">Chưa có yêu cầu chỉnh sửa cho ảnh nào.</p>
            )}
          </div>
          {(requests.length > 0 || !!album.selections?.length || !!replacementDrafts.length) && (
            <footer className="photographer-delivery__footer">
              <label className="photographer-delivery__actions">
                <input
                  type="checkbox"
                  checked={extension}
                  onChange={(event) => setExtension(event.target.checked)}
                />{' '}
                Giữ đuôi file
              </label>
              <div className="photographer-delivery__actions">
                {order.canManage && ['queued', 'awaiting_extra'].includes(album.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void command('reopen')}
                  >
                    Mở lại lựa chọn
                  </Button>
                )}
                {album.status === 'queued' && (
                  <Button type="button" disabled={busy} onClick={() => void command('start')}>
                    Bắt đầu retouch
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !requests.length}
                  onClick={() => exportNames()}
                >
                  Lấy tên file cần chỉnh
                </Button>
                {!!replacementDrafts.length && (
                  <Button type="button" disabled={activeWork} onClick={() => setStep('edited')}>
                    Xem bản chỉnh trước khi gửi
                  </Button>
                )}
              </div>
            </footer>
          )}
          {!!album.selections?.length && (
            <details className="photographer-delivery__details">
              <summary>
                Lịch sử chốt ({album.selections.length}) <ChevronDown aria-hidden="true" />
              </summary>
              <ul className="photographer-delivery__history">
                {album.selections.map((item) => (
                  <li key={item.round}>
                    <span>
                      Lần chốt {item.round} · {item.photos.length} ảnh · Phí thêm{' '}
                      {money(item.extra)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => exportNames(item.round)}
                    >
                      Lấy tên file lần chốt {item.round}
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {!!exportText && (
            <div className="photographer-delivery__export">
              <label htmlFor={`${formId}-export`}>Tên file cần chỉnh</label>
              <Textarea id={`${formId}-export`} readOnly value={exportText} rows={4} />
              <div className="photographer-delivery__actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(exportText)}
                >
                  Sao chép danh sách
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    saveBlob(
                      new Blob([exportText], { type: 'text/plain;charset=utf-8' }),
                      'anh-retouch.txt',
                    )
                  }
                >
                  Tải TXT
                </Button>
              </div>
            </div>
          )}
        </>
      );
  } else if (step === 'edited' && replacementDrafts.length) {
    const originalNames = new Map(originals.map((photo) => [photo.id, photo.name]));
    panel = (
      <>
        <DeliveryHeading title="Xem trước bản bàn giao" badge={`Bản ${latest + 1} · Bản nháp`} />
        <div
          className="photographer-delivery__photo-scroll"
          role="region"
          aria-label="Bản chỉnh đã tải"
          tabIndex={0}
        >
          <ul className="photographer-delivery__photo-rows">
            {replacementDrafts.map((photo) => (
              <li key={photo.id}>
                <ConceptPhotoImage orderId={id} photo={photo} thumbnail />
                <div className="photographer-delivery__caption">
                  <p>
                    <strong>Ảnh gốc</strong> {originalNames.get(photo.originalPhotoId || '')}
                  </p>
                  <p>
                    <strong>Bản chỉnh</strong> {photo.name}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={activeWork}
                    onClick={async () => {
                      setUploadBusy(true);
                      setError('');
                      try {
                        await conceptService.deleteDeliveryPhoto(id, photo.id);
                        await load();
                      } catch (err) {
                        setError(conceptError(err));
                      } finally {
                        setUploadBusy(false);
                      }
                    }}
                  >
                    Bỏ bản nháp
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <footer className="photographer-delivery__footer">
          <p>{replacementDrafts.length} bản chỉnh sẽ xuất hiện trong bản bàn giao mới cho khách.</p>
          <div className="photographer-delivery__actions">
            <Button
              type="button"
              variant="outline"
              disabled={activeWork}
              onClick={() => setStep('selection')}
            >
              Xem yêu cầu chỉnh ảnh
            </Button>
            <Button
              type="button"
              disabled={activeWork}
              onClick={() =>
                void command('deliver', {
                  deliveryPhotoIds: replacementDrafts.map((photo) => photo.id),
                })
              }
            >
              Gửi bản bàn giao mới
            </Button>
          </div>
        </footer>
      </>
    );
  } else if (step === 'edited') {
    panel = (
      <>
        {showEditedPreview ? (
          <>
            <div className="photographer-delivery__preview-heading">
              <DeliveryHeading
                title="Xem trước bản bàn giao"
                badge={`Bản ${latest + 1} · Bản nháp`}
              />
              <span className="photographer-delivery__badge" data-tone="success">
                <Check size={16} aria-hidden="true" /> {readyCount} ảnh đã đồng bộ
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={activeWork}
                onClick={() => setEditingSource('edited')}
              >
                Cập nhật từ Drive
              </Button>
            </div>
            <DrivePreview orderId={id} photos={preview} />
            <footer className="photographer-delivery__footer">
              <p>Khách chưa xem được bản này.</p>
              <Button
                type="button"
                disabled={activeWork}
                onClick={() => void command('deliver', { driveAlbum: true })}
              >
                Gửi bản bàn giao mới
              </Button>
            </footer>
          </>
        ) : (
          <>
            <DeliveryHeading
              title="Chuẩn bị ảnh đã chỉnh"
              badge={`Bản ${latest + 1} · Bản nháp`}
            />
            <div className="photographer-delivery__split">
              {album ? (
                <form
                  className="photographer-delivery__form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const parsed = splitFolders(editedFolders);
                    if (!parsed.length) {
                      setError('Dán link thư mục ảnh đã chỉnh trên Google Drive.');
                      return;
                    }
                    void command('delivery-sync', { folders: parsed });
                  }}
                >
                  <label htmlFor={`${formId}-edited`}>Thư mục Google Drive</label>
                  <div>
                    <Textarea
                      id={`${formId}-edited`}
                      placeholder="Dán link thư mục ảnh đã chỉnh"
                      rows={3}
                      value={editedFolders}
                      required
                      aria-describedby={`${formId}-edited-hint`}
                      disabled={activeWork || !editing}
                      onChange={(event) => setEditedFolders(event.target.value)}
                    />
                    <p id={`${formId}-edited-hint`} className="photographer-delivery__muted">
                      Mỗi link một dòng. Dùng thư mục riêng cho từng bản bàn giao.
                    </p>
                  </div>
                  <div className="photographer-delivery__actions photographer-delivery__form-actions">
                    <Button type="submit" disabled={activeWork || !editing}>
                      Lấy ảnh đã chỉnh
                    </Button>
                    {!!readyCount && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingSource(undefined)}
                      >
                        Xem bản nháp
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="photographer-delivery__export">
                  <p>Bạn có thể tải ảnh đã chỉnh trực tiếp lên hệ thống bên dưới, hoặc lấy ảnh gốc từ Drive trước.</p>
                  <Button type="button" variant="outline" onClick={() => setStep('album')}>
                    Mở bước album ảnh gốc
                  </Button>
                </div>
              )}
              <aside className="photographer-delivery__aside">
                <h3>Bản chuẩn bị</h3>
                <p>{readyCount ? `${readyCount} ảnh đã đồng bộ` : 'Chưa đồng bộ Drive'}</p>
              </aside>
            </div>
          </>
        )}
        {!showEditedPreview && order.canEdit && (
          <details
            className="photographer-delivery__details"
            open={uploadOpen}
            onToggle={(event) => setUploadOpen(event.currentTarget.open)}
          >
            <summary>
              Tải ảnh trực tiếp <ChevronDown aria-hidden="true" />
            </summary>
            {uploadOpen && (
              <div className="photographer-delivery__export">
                <ConceptLocalUpload
                  orderId={id}
                  previous={album?.photos.filter((p) => p.version === latest && p.source === 'local')}
                  onChange={setUploadIds}
                  onBusy={setUploadBusy}
                />
                <Button
                  type="button"
                  disabled={activeWork || !uploadIds.length}
                  onClick={() => void command('deliver', { deliveryPhotoIds: uploadIds })}
                >
                  Gửi ảnh tải lên
                </Button>
              </div>
            )}
          </details>
        )}
      </>
    );
  } else {
    panel = (
      <>
        <DeliveryHeading
          title={needsRevision ? 'Khách yêu cầu chỉnh sửa' : 'Theo dõi nghiệm thu'}
          badge={
            needsRevision
              ? 'Cần chỉnh sửa'
              : accepted
                ? 'Khách đã nghiệm thu'
                : latest && album?.status === 'delivered'
                  ? 'Chờ khách nghiệm thu'
                  : undefined
          }
          tone={accepted ? 'success' : 'warning'}
        />
        {!!feedbackRounds.length && (
          <ul className="photographer-delivery__feedback">
            {feedbackRounds.map((round) =>
              round.items.map((item, idx) => (
                <li key={`${round.id}-${idx}`} data-resolved={item.resolved}>
                  <p>
                    <strong>{labelForPhoto(item.photoId)}:</strong> {item.note}
                  </p>
                  <small>
                    Vòng {round.round} · Bản bàn giao {round.version} · {vnTime(round.at)}
                    {item.resolved ? ' · Đã xử lý' : ' · Chờ xử lý'}
                  </small>
                  {order.canEdit && album?.status === 'revising' && item.photoId && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={activeWork}
                        onClick={() =>
                          void command('resolve', {
                            roundId: round.id,
                            photoId: item.photoId,
                            resolved: !item.resolved,
                          })
                        }
                      >
                        {item.resolved ? 'Đánh dấu chưa xong' : 'Đã xử lý góp ý'}
                      </Button>
                    </div>
                  )}
                </li>
              )),
            )}
          </ul>
        )}
        {!!paidRequests.length && (
          <div className="space-y-3">
            <h3>Yêu cầu phát sinh có phí</h3>
            {paidRequests.map((reqItem) => (
              <div key={reqItem.id} className="rounded-lg border p-3 text-sm space-y-2">
                <p>
                  <strong>Bản v{reqItem.version}</strong> ·{' '}
                  {
                    (
                      {
                        requested: 'Chờ báo giá',
                        quoted: 'Đã báo giá',
                        awaiting_payment: 'Chờ thanh toán',
                        paid: 'Đã thanh toán',
                        processing: 'Đang xử lý',
                        resolved: 'Đã giao',
                        declined: 'Đã hủy',
                      } as Record<string, string>
                    )[reqItem.status] || reqItem.status
                  }
                </p>
                {reqItem.items.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {labelForPhoto(item.photoId)}: {item.note}
                    </span>
                    {order.canEdit && reqItem.status === 'processing' && item.photoId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={activeWork}
                        onClick={() =>
                          void command('resolve', {
                            roundId: reqItem.id,
                            photoId: item.photoId,
                            resolved: !item.resolved,
                          })
                        }
                      >
                        {item.resolved ? 'Đánh dấu chưa xong' : 'Đã xử lý'}
                      </Button>
                    )}
                  </div>
                ))}
                {reqItem.amount && (
                  <p>
                    {money(reqItem.amount)} · {reqItem.terms}
                  </p>
                )}
                {order.canManage && ['requested', 'quoted'].includes(reqItem.status) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Phí chỉnh thêm (VND)"
                      value={quotes[reqItem.id]?.amount || ''}
                      onChange={(e) =>
                        setQuotes((q) => ({
                          ...q,
                          [reqItem.id]: {
                            amount: e.target.value,
                            terms: q[reqItem.id]?.terms || '',
                          },
                        }))
                      }
                    />
                    <Input
                      placeholder="Phạm vi công việc"
                      value={quotes[reqItem.id]?.terms || ''}
                      onChange={(e) =>
                        setQuotes((q) => ({
                          ...q,
                          [reqItem.id]: {
                            amount: q[reqItem.id]?.amount || '',
                            terms: e.target.value,
                          },
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={activeWork || !quotes[reqItem.id]?.amount || !quotes[reqItem.id]?.terms}
                      onClick={() =>
                        void command('quote', {
                          requestId: reqItem.id,
                          amount: Number(quotes[reqItem.id].amount),
                          terms: quotes[reqItem.id].terms,
                        })
                      }
                    >
                      Gửi báo giá
                    </Button>
                  </div>
                )}
                {order.canEdit && reqItem.status === 'paid' && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={activeWork}
                    onClick={() => void command('start', { requestId: reqItem.id })}
                  >
                    Bắt đầu chỉnh thêm
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {selectedDelivery ? (
          <>
            <section className="photographer-delivery__version">
              <div className="photographer-delivery__line">
                <h3>Bản đã gửi</h3>
                {deliveries.length > 1 && (
                  <label className="photographer-delivery__actions">
                    <span>Phiên bản</span>
                    <select
                      value={selectedDelivery.version}
                      onChange={(event) => {
                        setVersion(Number(event.target.value));
                        setViewVersion(true);
                      }}
                    >
                      {deliveries.map((item) => (
                        <option key={item.version} value={item.version}>
                          Bản {item.version}
                          {item.version !== latest ? ' · bản cũ' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="photographer-delivery__version-row">
                {deliveryPhotos[0] ? (
                  <ConceptPhotoImage orderId={id} photo={deliveryPhotos[0]} thumbnail />
                ) : (
                  <ImageIcon className="photographer-delivery__empty-icon" aria-hidden="true" />
                )}
                <div>
                  <h4>Bản bàn giao {selectedDelivery.version}</h4>
                  <p className="photographer-delivery__muted">
                    {deliveryPhotos.length ? `${deliveryPhotos.length} ảnh · ` : ''}
                    {vnTime(selectedDelivery.at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={viewVersion}
                  onClick={() => setViewVersion((open) => !open)}
                >
                  {viewVersion ? 'Thu gọn ảnh' : 'Xem bản đã gửi'}
                </Button>
              </div>
              {viewVersion && (
                <div className="photographer-delivery__export">
                  {selectedDelivery.version !== latest && (
                    <p className="photographer-delivery__muted">Bạn đang xem bản cũ · chỉ xem.</p>
                  )}
                  {!!driveDeliveryPhotos.length && (
                    <DrivePreview
                      key={`drive-${selectedDelivery.version}`}
                      orderId={id}
                      photos={driveDeliveryPhotos}
                    />
                  )}
                  {!!localDeliveryPhotos.length && (
                    <ConceptLocalGallery
                      key={`upload-${selectedDelivery.version}`}
                      orderId={id}
                      photos={localDeliveryPhotos}
                      allowDownload
                      onDownload={async (photo) => {
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
                </div>
              )}
            </section>
            {needsRevision && (
              <div className="photographer-delivery__actions photographer-delivery__end">
                <Button type="button" onClick={() => setStep('edited')}>
                  Chuẩn bị bản bàn giao mới
                </Button>
              </div>
            )}
            {album && album.status === 'delivered' && selectedDelivery.version === latest && (
              <details className="photographer-delivery__details">
                <summary>
                  Bắt đầu chỉnh lại <ChevronDown aria-hidden="true" />
                </summary>
                <form
                  className="photographer-delivery__export"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!revisionNote.trim()) return;
                    void command('start', { revision: true, note: revisionNote.trim() }).then((ok) => {
                      if (ok) {
                        setRevisionNote('');
                        setStep('edited');
                      }
                    });
                  }}
                >
                  <label htmlFor={`${formId}-revision`}>Lý do bắt đầu chỉnh lại</label>
                  <Textarea
                    id={`${formId}-revision`}
                    value={revisionNote}
                    required
                    maxLength={2000}
                    onChange={(event) => setRevisionNote(event.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={activeWork || !revisionNote.trim()}
                  >
                    Bắt đầu chỉnh lại
                  </Button>
                </form>
              </details>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="photographer-delivery__muted">Chưa có bản bàn giao.</p>
            <Button type="button" variant="outline" onClick={() => setStep('edited')}>
              Đi tới bước Ảnh đã chỉnh
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="photographer-delivery" aria-label="Bàn giao ảnh">
      <nav className="photographer-delivery__steps" aria-label="Các bước bàn giao">
        <h2>Bàn giao ảnh</h2>
        <ol>
          {steps.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={step === item.id ? 'step' : undefined}
                aria-controls={panelId}
                disabled={!loaded || uploadBusy}
                onClick={() => {
                  setStep(item.id);
                  setError('');
                }}
              >
                <span aria-hidden="true" data-done={done[item.id]}>
                  {done[item.id] && step !== item.id ? <Check size={15} /> : index + 1}
                </span>
                {item.label}
                {done[item.id] && <span className="sr-only">, đã xong</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div id={panelId} className="photographer-delivery__body">
        {!loaded && <p role="status">Đang mở album…</p>}
        {error && (
          <p className="photographer-delivery__message" data-tone="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p
            className={notice === 'Đã lưu.' ? 'sr-only' : 'photographer-delivery__message'}
            role="status"
          >
            {notice}
          </p>
        )}
        {background.message && (
          <p
            className={
              background.pending || background.failed ? 'photographer-delivery__message' : 'sr-only'
            }
            data-tone={background.failed ? 'error' : undefined}
            role={background.failed ? 'alert' : 'status'}
          >
            {background.message}
          </p>
        )}
        {loaded && panel}
        {album && order.canManage && (
          <details className="photographer-delivery__details">
            <summary>
              Chia sẻ và quyền tải ảnh <ChevronDown aria-hidden="true" />
            </summary>
            <div className="photographer-delivery__export">
              <div className="photographer-delivery__actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void command('share')}
                >
                  Tạo link chỉ xem (7 ngày)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void command('revoke')}
                >
                  Thu hồi link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void command('download-policy', { allowed: !album.allowDownload })}
                >
                  {album.allowDownload ? 'Tắt tải ảnh' : 'Cho tải ảnh'}
                </Button>
              </div>
              {share && (
                <p className="text-sm break-all">
                  Link mới: <a href={share}>{share}</a>
                </p>
              )}
            </div>
          </details>
        )}
      </div>
      <Dialog
        open={!!replacementTarget}
        onOpenChange={(open) => {
          if (!open && !uploadBusy) setReplacementTarget(undefined);
        }}
      >
        {replacementTarget && (
          <DialogContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              replacementTrigger.current?.focus();
            }}
          >
            <DialogTitle>Tải bản chỉnh cho {replacementTarget.name}</DialogTitle>
            <DialogDescription>
              {replacementTarget.note || 'Chọn ảnh đã chỉnh cho yêu cầu này.'}
            </DialogDescription>
            <ConceptReplacementUpload
              orderId={id}
              original={replacementTarget}
              busy={activeWork}
              onBusy={setUploadBusy}
              onSaved={async () => {
                await load();
                setReplacementTarget(undefined);
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
