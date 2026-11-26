import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
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
import { AlbumImage } from './BookingAlbumImage';
import { DeliveryPhotoGallery, DeliveryThumbnail } from './customer/DeliveryPhotoGallery';
import { DeliveryPhotoUpload } from './customer/DeliveryPhotoUpload';
import { useBookingAlbum } from '@/hooks/useBookingAlbum';
import { albumClient, type AlbumPhoto, type BookingAlbum } from '@/services/bookingAlbumService';
import { bookingDeliveryService, deliveryError } from '@/services/bookingDeliveryService';
import {
  createWorkflowRequestId,
  type BookingWorkflowDto,
} from '@/services/bookingWorkflowService';
import '../styles/booking-album.css';
import '../styles/photographer-delivery.css';

const steps = [
  { id: 'album', label: 'Album ảnh gốc' },
  { id: 'selection', label: 'Yêu cầu chỉnh ảnh' },
  { id: 'edited', label: 'Ảnh đã chỉnh' },
  { id: 'review', label: 'Nghiệm thu' },
] as const;
type Step = (typeof steps)[number]['id'];
type Client = ReturnType<typeof albumClient>;
type Source = { title: string; folders: string; limit: string };
const photosPerRow = 3;
const rowsPerWindow = 3;
const defaultPhotoRatio = 4 / 3;
const photosPerWindow = photosPerRow * rowsPerWindow;
const photoBatchSize = photosPerWindow * 2;
const splitFolders = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
const sourceValues = (album: BookingAlbum): Source => ({
  title: album.title,
  folders: album.folders
    .map((row) => row.url || `https://drive.google.com/drive/folders/${row.id}`)
    .join('\n'),
  limit: String(album.limit),
});

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

function DrivePreview({
  client,
  photos,
  onCover,
  coverId,
  rows = false,
  details,
}: {
  client: Client;
  photos: AlbumPhoto[];
  onCover?: (photo: AlbumPhoto) => void;
  coverId?: string;
  rows?: boolean;
  details?: (photo: AlbumPhoto) => ReactNode;
}) {
  const [limit, setLimit] = useState(photoBatchSize);
  const [photoId, setPhotoId] = useState('');
  const [fullImage, setFullImage] = useState('');
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
    setFullImage('');
    setPhotoId(id);
  };
  const loadOnScroll = ({ currentTarget }: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = currentTarget;
    if (scrollHeight - scrollTop - clientHeight < clientHeight / 2) {
      setLimit((count) => Math.min(count + photoBatchSize, photos.length));
    }
  };
  if (!photos.length) return null;
  const visiblePhotos = photos.slice(0, limit);
  const imageKey = (photo: AlbumPhoto) => `${photo.id}:${photo.sourceVersion ?? ''}`;
  const photoRatio = (photo: AlbumPhoto) => {
    const ratio = photo.width / photo.height;
    const reserved = ratio > 0 && Number.isFinite(ratio) ? ratio : defaultPhotoRatio;
    return loadedRatios[imageKey(photo)] ?? reserved;
  };
  const renderPhoto = (photo: AlbumPhoto, ratio?: number) => (
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
          <AlbumImage client={client} photo={photo} thumbnail />
        </button>
        {photo.driveId === coverId && <span>Ảnh bìa</span>}
      </div>
      <div className="photographer-delivery__caption">
        <span title={photo.name}>{photo.name}</span>
        {photo.note && <p>{photo.note}</p>}
        {details?.(photo)}
        {onCover && photo.available && photo.driveId !== coverId && (
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
            {visiblePhotos.map((photo) => renderPhoto(photo))}
          </ul>
        ) : (
          <div className="photographer-delivery__gallery" role="group" aria-label="Danh sách ảnh">
            {Array.from({ length: Math.ceil(visiblePhotos.length / photosPerRow) }, (_, index) => {
              const start = index * photosPerRow;
              const row = visiblePhotos.slice(start, start + photosPerRow);
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
        onOpenChange={(value) => {
          if (!value) open('');
        }}
      >
        {active && (
          <DialogContent className="photographer-delivery__viewer">
            <DialogTitle>{active.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Ảnh {index + 1} trên {photos.length}
            </DialogDescription>
            <AlbumImage key={active.id} client={client} photo={active} onUrl={setFullImage} />
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
              {fullImage && (
                <Button asChild variant="outline">
                  <a href={fullImage} download={active.name}>
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

function ReplacementUpload({
  bookingId,
  original,
  busy,
  onBusy,
  onSaved,
}: {
  bookingId: string;
  original: AlbumPhoto;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const inputId = useId();
  const [upload, setUpload] = useState<{ file: File; key: string }>();
  const [error, setError] = useState('');
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!upload || busy || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setError('');
    onBusy(true);
    try {
      await bookingDeliveryService.upload(
        bookingId,
        upload.file,
        upload.key,
        controller.signal,
        original.id,
      );
      if (!controller.signal.aborted) await onSaved();
    } catch (error) {
      if (!controller.signal.aborted) setError(deliveryError(error));
    } finally {
      request.current = undefined;
      onBusy(false);
    }
  };

  return (
    <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
      <label htmlFor={inputId}>Tệp ảnh đã chỉnh</label>
      <Input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        aria-describedby={inputId + '-hint'}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && (!file.size || file.size > 20 * 1024 * 1024)) {
            event.target.value = '';
            setUpload(undefined);
            setError('Chọn một ảnh có dung lượng lớn hơn 0 và tối đa 20 MB.');
            return;
          }
          setError('');
          setUpload(file ? { file, key: createWorkflowRequestId() } : undefined);
        }}
      />
      <p id={inputId + '-hint'} className="text-sm text-muted-foreground">
        JPEG, PNG hoặc WebP · tối đa 20 MB. Khách sẽ thấy bản chỉnh khi bạn gửi bàn giao.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !upload}>
        {busy ? 'Đang tải bản chỉnh…' : 'Lưu bản chỉnh'}
      </Button>
    </form>
  );
}

export function PhotographerDeliveryWorkspace({
  record,
  requestedTab,
  requestedVersion = 0,
  reloadCount,
  onWorkflowChange,
}: {
  record: BookingWorkflowDto;
  requestedTab: string | null;
  requestedVersion?: number;
  reloadCount: number;
  onWorkflowChange: (record: BookingWorkflowDto) => void;
}) {
  const { booking, workflow } = record;
  const client = useMemo(() => albumClient(true, booking._id), [booking._id]);
  const panelId = useId();
  const formId = useId();
  const [stepOverride, setStep] = useState<Step>();
  const [editingSource, setEditingSource] = useState<Step>();
  const [source, setSource] = useState<Source>({
    title: booking.className ? `Kỉ yếu ${booking.className}` : 'Album ảnh gốc',
    folders: '',
    limit: '0',
  });
  const [editedFolders, setEditedFolders] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadIds, setUploadIds] = useState<string[]>([]);
  const [replacementTarget, setReplacementTarget] = useState<AlbumPhoto>();
  const replacementTrigger = useRef<HTMLButtonElement>();
  const [versionOverride, setVersion] = useState(requestedVersion);
  const [viewVersion, setViewVersion] = useState(!!requestedVersion);
  const [revisionNote, setRevisionNote] = useState('');
  const {
    album,
    loaded,
    loadFailed,
    error,
    setError,
    notice,
    background,
    busy,
    command,
    refresh,
    workflowAction,
    extension,
    setExtension,
    exportText,
    exportNames,
    copy,
    downloadText,
  } = useBookingAlbum(client, booking._id, {
    reloadCount,
    onLoad(next) {
      if (next) setSource(sourceValues(next));
    },
    onSync() {
      setEditingSource(undefined);
    },
  });
  const progress = workflow.progress;
  const latest = progress?.deliveryVersion ?? 0;
  const editing = workflow.lifecycle === 'editing';
  const needsRevision = workflow.lifecycle === 'revision_requested';
  const originals = album?.photos.filter((photo) => photo.deliveryVersion === 0) ?? [];
  const imported = originals.filter((photo) => photo.available).length;
  const requests = originals.filter((photo) => photo.selected);
  const replacementDrafts =
    album?.replacements?.filter((photo) => photo.deliveryVersion === -1) ?? [];
  const draftsByOriginal = new Map(
    replacementDrafts.map((photo) => [photo.originalPhotoId, photo]),
  );
  const updatedOriginals = new Set(
    album?.replacements
      ?.filter((photo) => photo.deliveryVersion > 0)
      .map((photo) => photo.originalPhotoId),
  );
  const requestedIds = new Set(
    requests.filter((photo) => photo.available).map((photo) => photo.id),
  );
  const preview = album?.photos.filter((photo) => photo.deliveryVersion === -1) ?? [];
  const readyCount = preview.filter((photo) => photo.available).length;
  const showEditedPreview = readyCount > 0 && editingSource !== 'edited';
  const published = !!album && album.status !== 'draft';
  const accepted = latest > 0 && progress?.acceptedDeliveryVersion === latest;
  const step: Step =
    stepOverride ??
    (requestedVersion > 0
      ? 'review'
      : requestedTab === 'selection'
        ? published
          ? 'selection'
          : 'album'
        : needsRevision || (latest && !editing)
          ? 'review'
          : requestedTab === 'delivery' ||
              replacementDrafts.length ||
              readyCount ||
              (latest && editing)
            ? 'edited'
            : published
              ? 'selection'
              : 'album');
  const done = {
    album: published,
    selection: !!album?.finalizedAt,
    edited: latest > 0,
    review: accepted,
  };
  const activeWork = busy || uploadBusy;
  const sourceDisabled = busy || !editing || album?.status === 'closed';
  const archived = workflow.deliveryHistory.filter((item) => item.version !== latest);
  const deliveries =
    progress && latest
      ? [{ ...progress, version: latest }, ...archived].sort((a, b) => b.version - a.version)
      : archived;
  const delivery = deliveries.find((item) => item.version === versionOverride) ?? deliveries[0];
  const deliveryPhotos =
    album?.photos.filter((photo) => photo.deliveryVersion === delivery?.version) ?? [];
  const otherPhotos =
    delivery?.photos?.filter((photo) => photo.source !== 'drive' || !deliveryPhotos.length) ?? [];
  const feedback = (progress?.revisionRequests ?? []).filter((item) =>
    !item.deliveryVersion
      ? delivery?.version === latest
      : item.deliveryVersion === delivery?.version,
  );
  const currentVersion = delivery?.version === latest;
  const pendingCount = requests.filter(
    (photo) => !updatedOriginals.has(photo.id) || draftsByOriginal.has(photo.id),
  ).length;
  const canStageReplacement = editing || needsRevision;

  const configure = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = source.title.trim();
    const folders = splitFolders(source.folders);
    const limit = Number(source.limit);
    if (
      !title ||
      !folders.length ||
      source.limit === '' ||
      !Number.isInteger(limit) ||
      limit < 0 ||
      limit > 10000
    ) {
      setError('Kiểm tra tên album, link thư mục Drive và giới hạn yêu cầu từ 0 đến 10.000 ảnh.');
      return;
    }
    void command('configure', { title, folders, limit });
  };
  const syncEdited = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const folders = splitFolders(editedFolders);
    if (!folders.length) {
      setError('Dán link thư mục ảnh đã chỉnh trên Google Drive.');
      return;
    }
    void command('delivery-sync', { folders });
  };
  const updateWorkflow = async (
    action: 'progress.update' | 'delivery.revision.start',
    data: Record<string, unknown>,
  ) => {
    const next = await workflowAction(workflow.version, action, data);
    if (!next) return;
    onWorkflowChange(next);
    setVersion(0);
    setViewVersion(false);
    if (data.status === 'editing') {
      setEditingSource(undefined);
      setStep('edited');
    } else {
      if (data.status === 'delivered') {
        setEditedFolders('');
        setUploadIds([]);
        setUploadOpen(false);
      }
      setRevisionNote('');
      setStep('review');
    }
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
          <form className="photographer-delivery__form" onSubmit={configure}>
            <label htmlFor={`${formId}-title`}>Tên album</label>
            <Input
              id={`${formId}-title`}
              value={source.title}
              required
              maxLength={160}
              disabled={sourceDisabled}
              onChange={(event) => setSource({ ...source, title: event.target.value })}
            />
            <label htmlFor={`${formId}-folders`}>Thư mục Google Drive</label>
            <div>
              <Textarea
                id={`${formId}-folders`}
                value={source.folders}
                placeholder="Dán link thư mục ảnh gốc"
                rows={3}
                required
                disabled={sourceDisabled}
                aria-describedby={`${formId}-folder-hint`}
                onChange={(event) => setSource({ ...source, folders: event.target.value })}
              />
              <p id={`${formId}-folder-hint`} className="photographer-delivery__muted">
                Mỗi link một dòng. Bật quyền xem bằng liên kết trên Drive.
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
                value={source.limit}
                required
                disabled={sourceDisabled}
                onChange={(event) => setSource({ ...source, limit: event.target.value })}
              />
              <span className="photographer-delivery__muted">ảnh · 0 là không giới hạn</span>
            </div>
            <div className="photographer-delivery__actions photographer-delivery__form-actions">
              <Button type="submit" disabled={sourceDisabled}>
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
            <h3>Ảnh gốc</h3>
            <p>Khách sẽ thấy album sau khi bạn xuất bản.</p>
            {!editing && <p>Có thể lấy ảnh khi đơn đang hậu kỳ.</p>}
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
            {album?.title}
            {album?.limit ? ` · Tối đa ${album.limit} ảnh cần chỉnh` : ''}
          </p>
          <div className="photographer-delivery__actions">
            {editing && album?.status !== 'closed' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void command('sync')}
                >
                  Cập nhật từ Drive
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (album) setSource(sourceValues(album));
                    setEditingSource('album');
                  }}
                >
                  Sửa nguồn ảnh
                </Button>
              </>
            )}
          </div>
        </div>
        <DrivePreview
          client={client}
          photos={originals}
          coverId={album?.coverId}
          onCover={!busy ? (photo) => void command('cover', { coverId: photo.driveId }) : undefined}
        />
        <footer className="photographer-delivery__footer">
          <p>{published ? 'Khách đã có thể mở album.' : 'Khách chưa xem được album.'}</p>
          {published ? (
            <Button type="button" variant="outline" onClick={() => setStep('selection')}>
              Xem yêu cầu chỉnh ảnh
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy || !editing}
              onClick={async () => {
                if (await command('publish')) setStep('selection');
              }}
            >
              Xuất bản album
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
            Xuất bản album để khách gửi yêu cầu chỉnh sửa.
          </p>
          <Button type="button" variant="outline" onClick={() => setStep('album')}>
            Mở bước album ảnh gốc
          </Button>
        </>
      ) : (
        <>
          <DeliveryHeading
            title="Yêu cầu chỉnh ảnh"
            badge={
              album.finalizedAt
                ? 'Khách đã gửi yêu cầu'
                : album.status === 'open' && editing
                  ? 'Đang nhận yêu cầu'
                  : 'Đã đóng nhận yêu cầu'
            }
            tone={album.finalizedAt ? 'success' : 'info'}
          />
          <div className="min-w-0">
            {requests.length ? (
              <>
                <p className="photographer-delivery__muted">
                  {requests.length} ảnh có yêu cầu · {pendingCount} ảnh chờ bàn giao
                </p>
                <DrivePreview
                  client={client}
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
                        {canStageReplacement && photo.available && (
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
          {(requestedIds.size > 0 ||
            !!album.selectionHistory?.length ||
            !!replacementDrafts.length) && (
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
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !requestedIds.size}
                  onClick={() => void exportNames()}
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
          {!!album.selectionHistory?.length && (
            <details className="photographer-delivery__details">
              <summary>
                Lịch sử gửi yêu cầu ({album.selectionHistory.length}){' '}
                <ChevronDown aria-hidden="true" />
              </summary>
              <ul className="photographer-delivery__history">
                {album.selectionHistory.map((item) => (
                  <li key={item.round}>
                    <span>
                      {item.count} ảnh · {formatTime(item.at)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void exportNames(item.round)}
                    >
                      Lấy tên file lần gửi {item.round}
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
                <Button type="button" variant="outline" onClick={() => void copy(exportText)}>
                  Sao chép danh sách
                </Button>
                <Button type="button" variant="outline" onClick={downloadText}>
                  Tải TXT
                </Button>
              </div>
            </div>
          )}
        </>
      );
  } else if (step === 'edited' && replacementDrafts.length) {
    const originalNames = new Map(originals.map((photo) => [photo.id, photo.name]));
    const ready = replacementDrafts.every((photo) => requestedIds.has(photo.originalPhotoId));
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
                <AlbumImage client={client} photo={photo} thumbnail />
                <div className="photographer-delivery__caption">
                  <p>
                    <strong>Ảnh gốc</strong> {originalNames.get(photo.originalPhotoId)}
                  </p>
                  <p>
                    <strong>Bản chỉnh</strong> {photo.name}
                  </p>
                  {!requestedIds.has(photo.originalPhotoId) && (
                    <p>Yêu cầu chỉnh ảnh đã thay đổi.</p>
                  )}
                  {canStageReplacement && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={activeWork}
                      aria-label={`Bỏ bản nháp ${photo.name}`}
                      onClick={async () => {
                        setUploadBusy(true);
                        setError('');
                        try {
                          await bookingDeliveryService.remove(booking._id, photo.id);
                          await refresh();
                        } catch (error) {
                          setError(deliveryError(error));
                        } finally {
                          setUploadBusy(false);
                        }
                      }}
                    >
                      Bỏ bản nháp
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <footer className="photographer-delivery__footer">
          <p>{replacementDrafts.length} bản chỉnh sẽ thay đúng ảnh gốc trong album của khách.</p>
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
              disabled={activeWork || !editing || !ready}
              onClick={() =>
                void updateWorkflow('progress.update', {
                  status: 'delivered',
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
        {canStageReplacement && pendingCount > 0 && (
          <div className="photographer-delivery__line">
            <p className="photographer-delivery__muted">
              Tải bản chỉnh từ từng yêu cầu để thay đúng ảnh gốc.
            </p>
            <Button type="button" variant="outline" onClick={() => setStep('selection')}>
              Xem yêu cầu chỉnh ảnh
            </Button>
          </div>
        )}
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
                disabled={activeWork || (!editing && !needsRevision)}
                onClick={() => setEditingSource('edited')}
              >
                Cập nhật từ Drive
              </Button>
            </div>
            <DrivePreview key="draft-delivery" client={client} photos={preview} />
            <footer className="photographer-delivery__footer">
              <p>Khách chưa xem được bản này.</p>
              <Button
                type="button"
                disabled={activeWork || !editing || !album}
                onClick={() => {
                  if (album)
                    void updateWorkflow('progress.update', {
                      status: 'delivered',
                      driveAlbum: true,
                      albumVersion: album.version,
                    });
                }}
              >
                Gửi bản bàn giao mới
              </Button>
            </footer>
          </>
        ) : (
          <>
            <DeliveryHeading title="Chuẩn bị ảnh đã chỉnh" badge={`Bản ${latest + 1} · Bản nháp`} />
            <div className="photographer-delivery__split">
              {album ? (
                <form className="photographer-delivery__form" onSubmit={syncEdited}>
                  <label htmlFor={`${formId}-edited`}>Thư mục Google Drive</label>
                  <div>
                    <Textarea
                      id={`${formId}-edited`}
                      placeholder="Dán link thư mục ảnh đã chỉnh"
                      rows={3}
                      value={editedFolders}
                      required
                      aria-describedby={`${formId}-edited-hint`}
                      disabled={activeWork || (!editing && !needsRevision)}
                      onChange={(event) => setEditedFolders(event.target.value)}
                    />
                    <p id={`${formId}-edited-hint`} className="photographer-delivery__muted">
                      Mỗi link một dòng. Dùng thư mục riêng cho từng bản bàn giao.
                    </p>
                  </div>
                  <div className="photographer-delivery__actions photographer-delivery__form-actions">
                    <Button type="submit" disabled={activeWork || (!editing && !needsRevision)}>
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
                  <p>Chuẩn bị album ảnh gốc trước khi lấy ảnh đã chỉnh từ Drive.</p>
                  <Button type="button" variant="outline" onClick={() => setStep('album')}>
                    Mở bước album ảnh gốc
                  </Button>
                </div>
              )}
              <aside className="photographer-delivery__aside">
                <h3>Bản chuẩn bị</h3>
                <p>{readyCount ? `${readyCount} ảnh đã đồng bộ` : 'Chưa đồng bộ ảnh'}</p>
              </aside>
            </div>
          </>
        )}
        {editing && !showEditedPreview && (
          <details
            className="photographer-delivery__details"
            onToggle={(event) => {
              if (event.currentTarget.open) setUploadOpen(true);
            }}
          >
            <summary>
              Tải ảnh trực tiếp <ChevronDown aria-hidden="true" />
            </summary>
            {uploadOpen && (
              <div className="photographer-delivery__export">
                <DeliveryPhotoUpload
                  bookingId={booking._id}
                  previous={progress?.photos}
                  onChange={setUploadIds}
                  onBusy={setUploadBusy}
                />
                <Button
                  type="button"
                  disabled={activeWork || !uploadIds.length}
                  onClick={() =>
                    void updateWorkflow('progress.update', {
                      status: 'delivered',
                      deliveryPhotoIds: uploadIds,
                    })
                  }
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
    let oldLink: string | undefined;
    try {
      const url = new URL(delivery?.deliveryUrl ?? '');
      if (['http:', 'https:'].includes(url.protocol)) oldLink = url.toString();
    } catch {
      /* Older records may have no link. */
    }
    panel = (
      <>
        <DeliveryHeading
          title={
            needsRevision && currentVersion ? 'Khách yêu cầu chỉnh sửa' : 'Theo dõi nghiệm thu'
          }
          badge={
            needsRevision && currentVersion
              ? 'Cần chỉnh sửa'
              : accepted
                ? 'Khách đã nghiệm thu'
                : latest && workflow.lifecycle === 'delivered'
                  ? 'Chờ khách nghiệm thu'
                  : undefined
          }
          tone={accepted ? 'success' : 'warning'}
        />
        {!!feedback.length && (
          <ul className="photographer-delivery__feedback">
            {feedback.map((item) => (
              <li key={item._id} data-resolved={!!item.resolvedAt}>
                <p>{item.note}</p>
                <small>
                  Bản bàn giao {item.deliveryVersion ?? delivery?.version} · {formatTime(item.at)}
                  {item.resolvedAt ? ' · Đã xử lý' : ''}
                </small>
              </li>
            ))}
          </ul>
        )}
        {needsRevision && currentVersion && (
          <div className="photographer-delivery__actions photographer-delivery__end">
            <Button
              type="button"
              disabled={activeWork}
              onClick={() => void updateWorkflow('progress.update', { status: 'editing' })}
            >
              Chuyển sang hậu kỳ
            </Button>
          </div>
        )}
        {delivery ? (
          <>
            <section className="photographer-delivery__version">
              <div className="photographer-delivery__line">
                <h3>Bản đã gửi</h3>
                {deliveries.length > 1 && (
                  <label className="photographer-delivery__actions">
                    <span>Phiên bản</span>
                    <select
                      value={delivery.version}
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
                  <AlbumImage client={client} photo={deliveryPhotos[0]} thumbnail />
                ) : otherPhotos[0] ? (
                  <DeliveryThumbnail
                    bookingId={booking._id}
                    photo={otherPhotos[0]}
                    onSelect={() => setViewVersion(true)}
                  />
                ) : (
                  <ImageIcon className="photographer-delivery__empty-icon" aria-hidden="true" />
                )}
                <div>
                  <h4>Bản bàn giao {delivery.version}</h4>
                  <p className="photographer-delivery__muted">
                    {delivery.photos?.length || deliveryPhotos.length
                      ? `${delivery.photos?.length || deliveryPhotos.length} ảnh · `
                      : ''}
                    {formatTime(delivery.deliveredAt)}
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
                  {!currentVersion && (
                    <p className="photographer-delivery__muted">Bạn đang xem bản cũ · chỉ xem.</p>
                  )}
                  <DrivePreview
                    key={`drive-${delivery.version}`}
                    client={client}
                    photos={deliveryPhotos}
                  />
                  {!!otherPhotos.length && (
                    <DeliveryPhotoGallery
                      key={`upload-${delivery.version}`}
                      bookingId={booking._id}
                      photos={otherPhotos}
                    />
                  )}
                  {!otherPhotos.length &&
                    !deliveryPhotos.length &&
                    (oldLink ? (
                      <Button asChild variant="outline">
                        <a href={oldLink} target="_blank" rel="noopener noreferrer">
                          Mở album bàn giao cũ
                        </a>
                      </Button>
                    ) : (
                      <p className="photographer-delivery__muted">
                        Chưa thể mở ảnh của bản bàn giao này.
                      </p>
                    ))}
                </div>
              )}
            </section>
            <div className="photographer-delivery__footer photographer-delivery__muted">
              {accepted ? (
                <p>
                  Khách đã xác nhận bản {latest}
                  {progress?.acceptedAt && ` · ${formatTime(progress.acceptedAt)}`}.
                </p>
              ) : (
                !feedback.length && (
                  <p>Chưa có phản hồi từ khách. Khách xác nhận bộ ảnh trong tài khoản.</p>
                )
              )}
            </div>
            {album && currentVersion && workflow.lifecycle === 'delivered' && (
              <details className="photographer-delivery__details">
                <summary>
                  Bắt đầu chỉnh lại <ChevronDown aria-hidden="true" />
                </summary>
                <form
                  className="photographer-delivery__export"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (revisionNote.trim())
                      void updateWorkflow('delivery.revision.start', {
                        deliveryVersion: latest,
                        note: revisionNote.trim(),
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
          <p className="photographer-delivery__muted">Chưa có bản bàn giao.</p>
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
                disabled={!loaded || uploadBusy || (step === 'edited' && busy && uploadOpen)}
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
        {loaded &&
          (loadFailed && step !== 'review' ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>
              Tải lại album
            </Button>
          ) : (
            panel
          ))}
        {!!album?.skipped?.length && (
          <details className="photographer-delivery__details">
            <summary>
              {album.skipped.length} tệp bị bỏ qua <ChevronDown aria-hidden="true" />
            </summary>
            <ul className="photographer-delivery__skipped">
              {album.skipped.map((name, index) => (
                <li key={`${name}-${index}`}>{name}</li>
              ))}
            </ul>
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
            <ReplacementUpload
              bookingId={booking._id}
              original={replacementTarget}
              busy={activeWork}
              onBusy={setUploadBusy}
              onSaved={async () => {
                await refresh();
                setReplacementTarget(undefined);
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
