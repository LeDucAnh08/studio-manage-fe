import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
  type SyntheticEvent,
} from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  GalleryHorizontalEnd,
  Images,
  MessageSquare,
} from 'lucide-react';
import Logo from '@/components/atoms/Logo';
import { AlbumImage } from '@/components/BookingAlbumImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { useBookingAlbum } from '@/hooks/useBookingAlbum';
import type {
  albumClient,
  AlbumPhoto,
  AlbumReplacement,
  BookingAlbum,
} from '@/services/bookingAlbumService';
import { CustomerButton } from './CustomerButton';
import { CustomerSelect, CustomerTextarea } from './CustomerFields';
import '../../styles/booking-album.css';
import '../../styles/customer.css';
import '../../styles/customer-drive-album.css';

const pageSize = 60;
const stripSize = 10;
const noteLimit = 2000;
const mobileGallery = '(max-width: 700px)';
const fallbackRatio = 4 / 3;
type GalleryPhoto = AlbumPhoto & { replacement?: AlbumReplacement };
const imageKey = (photo: GalleryPhoto) =>
  photo.replacement
    ? 'local-' + photo.replacement.id
    : photo.id + ':' + (photo.sourceVersion ?? '');

type Props = {
  client: ReturnType<typeof albumClient>;
  account: boolean;
  embedded: boolean;
  section?: 'selection' | 'delivery';
  deliveryVersion?: number;
  canCommentDelivery?: boolean;
  onAlbumChange?: (album: BookingAlbum | null) => void;
};

type AlbumSession = ReturnType<typeof useBookingAlbum>;

function AlbumMessages({ session, viewing = false }: { session: AlbumSession; viewing?: boolean }) {
  const { error, notice, busy, refresh } = session;
  return (
    <div className="customer-drive-album__messages">
      {error && (
        <>
          <p role="alert">{error}</p>
          <CustomerButton
            type="button"
            variant="text"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {viewing ? 'Tải lại album · giữ ghi chú đang viết' : 'Thử tải lại'}
          </CustomerButton>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}

export function CustomerDriveAlbum({
  client,
  account,
  embedded,
  section,
  deliveryVersion,
  canCommentDelivery,
  onAlbumChange,
}: Props) {
  const session = useBookingAlbum(client, undefined, { onChange: onAlbumChange });
  const { album, loaded, error } = session;
  const publicId = album?.publicId;
  const thumbnailCache = useMemo(
    () => (publicId ? new Map<string, Blob>() : undefined),
    [publicId],
  );
  useEffect(() => () => thumbnailCache?.clear(), [thumbnailCache]);
  const [edited, setEdited] = useState<boolean>();
  const [requestedVersion, setRequestedVersion] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [visited, setVisited] = useState({ original: false, edited: false });
  const content = useRef<HTMLElement>(null);
  const focusTab = useRef(false);
  const versions = useMemo(
    () => [...(album?.deliveryVersions ?? [])].sort((a, b) => b - a),
    [album?.deliveryVersions],
  );
  const original = embedded
    ? section !== 'delivery'
    : !(edited ?? versions.includes(album?.latestDeliveryVersion ?? 0));
  const tab = original ? 'original' : 'edited';
  const editedVersion = embedded
    ? deliveryVersion
    : versions.includes(requestedVersion)
      ? requestedVersion
      : versions[0];
  const showEdited = !embedded || (editedVersion !== undefined && versions.includes(editedVersion));
  const showActivePanel = !!album && (original || showEdited);

  useLayoutEffect(() => {
    if (showActivePanel)
      setVisited((previous) => (previous[tab] ? previous : { ...previous, [tab]: true }));
  }, [showActivePanel, tab]);
  useLayoutEffect(() => {
    if (!focusTab.current) return;
    content.current
      ?.querySelector<HTMLButtonElement>(
        '[data-album-panel]:not([hidden]) nav button[aria-pressed="true"]',
      )
      ?.focus({ preventScroll: true });
    focusTab.current = false;
  }, [tab]);

  const selectSection = (nextEdited: boolean) => {
    if (nextEdited === !original) return;
    focusTab.current = true;
    setEdited(nextEdited);
  };
  const navigation = !embedded && (
    <nav className="customer-drive-album__tabs" aria-label="Các phần của album">
      <button type="button" aria-pressed={original} onClick={() => selectSection(false)}>
        <Images size={18} aria-hidden="true" />{' '}
        {album?.replacements?.length ? 'Album ảnh' : 'Ảnh gốc'}
      </button>
      <button type="button" aria-pressed={!original} onClick={() => selectSection(true)}>
        <GalleryHorizontalEnd size={18} aria-hidden="true" /> Ảnh đã chỉnh
      </button>
    </nav>
  );
  const panels = [
    { tab: 'original', version: 0, available: true },
    { tab: 'edited', version: editedVersion, available: showEdited },
  ] as const;
  const Container = embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';

  if (embedded && loaded && !original && !album && !error) return null;
  return (
    <div
      className={
        'customer-drive-album customer-tokens customer-ui' +
        (embedded ? ' customer-drive-album--embedded' : '')
      }
    >
      {!embedded && (
        <header className="customer-drive-album__brand">
          <div className="customer-drive-album__width">
            <div>
              <Logo size={36} /> <span aria-hidden="true">Yume Studio</span>
            </div>
            <p>Album của bạn</p>
          </div>
        </header>
      )}
      <Container
        ref={content}
        className="customer-drive-album__width customer-drive-album__content"
      >
        {!loaded && <p role="status">Đang mở album…</p>}
        {loaded && !showActivePanel && (
          <>
            {(original || error) && <AlbumMessages session={session} />}
            {original && (
              <div className="customer-drive-album__empty">
                <Heading>
                  {account && !error ? 'Studio chưa mở album ảnh gốc' : 'Album chưa khả dụng'}
                </Heading>
                <p>
                  {account && !error
                    ? 'Ảnh sẽ xuất hiện ở đây khi studio mở album.'
                    : 'Kiểm tra lại link đầy đủ hoặc liên hệ studio.'}
                </p>
              </div>
            )}
          </>
        )}
        {album &&
          panels.map(
            (panel) =>
              panel.available &&
              (panel.tab === tab || visited[panel.tab]) && (
                <CustomerDriveAlbumPanel
                  key={album.publicId + ':' + panel.tab + ':' + panel.version}
                  album={album}
                  session={session}
                  client={client}
                  thumbnailCache={thumbnailCache}
                  embedded={embedded}
                  visible={panel.tab === tab}
                  version={panel.version}
                  versions={versions}
                  onVersionChange={setRequestedVersion}
                  canCommentDelivery={canCommentDelivery}
                  navigation={navigation}
                  drafts={drafts}
                  setDrafts={setDrafts}
                />
              ),
          )}
      </Container>
    </div>
  );
}

function CustomerDriveAlbumPanel({
  album,
  session,
  client,
  thumbnailCache,
  embedded,
  visible,
  version,
  versions,
  onVersionChange,
  canCommentDelivery,
  navigation,
  drafts,
  setDrafts,
}: {
  album: BookingAlbum;
  session: AlbumSession;
  client: Props['client'];
  thumbnailCache?: Map<string, Blob>;
  embedded: boolean;
  visible: boolean;
  version: number | undefined;
  versions: number[];
  onVersionChange: (version: number) => void;
  canCommentDelivery?: boolean;
  navigation: ReactNode;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const { setError, busy, command } = session;
  const [annotatedOnly, setAnnotatedOnly] = useState(false);
  const [folder, setFolder] = useState('');
  const [shown, setShown] = useState(pageSize);
  const [activeId, setActiveId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [columns, setColumns] = useState(() => (window.matchMedia(mobileGallery).matches ? 2 : 4));
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const noteId = useId();
  const gallery = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const activeThumb = useRef<HTMLButtonElement>(null);
  const scrollPosition = useRef<number>();

  const latest = album.latestDeliveryVersion;
  const original = version === 0;
  const photos = useMemo<GalleryPhoto[]>(() => {
    const versionPhotos = album.photos.filter((photo) => photo.deliveryVersion === version);
    if (!original || !album.replacements?.length) return versionPhotos;
    const replacements = new Map(
      album.replacements
        .filter((photo) => photo.deliveryVersion > 0)
        .map((photo) => [photo.originalPhotoId, photo]),
    );
    return versionPhotos.map((photo) => {
      const replacement = replacements.get(photo.id);
      return replacement ? { ...photo, replacement } : photo;
    });
  }, [album.photos, album.replacements, version, original]);
  const canRequest = original && album.canSelect;
  const canReview =
    album.canCommentDelivery && canCommentDelivery !== false && !original && version === latest;
  const annotated = (photo: AlbumPhoto) =>
    original ? photo.available && photo.selected : !!photo.note;
  const matchingCount = photos.filter(annotated).length;
  const filtered = photos.filter(
    (photo) =>
      (original ? !folder || photo.folderId === folder : true) &&
      (!annotatedOnly || annotated(photo)),
  );
  const active = photos.find((photo) => photo.id === activeId);
  const viewing = !!active;
  const canWrite = !!active?.available && (canRequest || canReview);
  const note = active ? (drafts[active.id] ?? active.note ?? '') : '';
  const dirty = !!active && note !== (active.note ?? '');
  const missingDraft =
    original &&
    photos.find(
      (photo) =>
        photo.available &&
        drafts[photo.id] !== undefined &&
        drafts[photo.id] !== (photo.note ?? ''),
    );
  const viewPhotos = filtered.some((photo) => photo.id === activeId) ? filtered : photos;
  const activeIndex = viewPhotos.findIndex((photo) => photo.id === activeId);
  const stripStart = Math.max(0, Math.min(activeIndex - 4, viewPhotos.length - stripSize));
  const cover =
    original &&
    photos.find(
      (photo) => photo.driveId === album.coverId && (photo.available || photo.replacement),
    );

  useEffect(() => {
    const media = window.matchMedia(mobileGallery);
    const update = () => setColumns(media.matches ? 2 : 4);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    if (!visible) return;
    if (viewing) {
      backButton.current?.focus();
    } else if (opener.current) {
      (opener.current.isConnected ? opener.current : gallery.current)?.focus();
      opener.current = null;
    }
  }, [visible, viewing]);
  useLayoutEffect(() => {
    if (!visible) return;
    if (scrollPosition.current !== undefined && window.scrollY !== scrollPosition.current) {
      window.scrollTo({ top: scrollPosition.current, behavior: 'instant' });
    }
    const rememberScroll = () => {
      scrollPosition.current = window.scrollY;
    };
    rememberScroll();
    window.addEventListener('scroll', rememberScroll, { passive: true });
    return () => window.removeEventListener('scroll', rememberScroll);
  }, [visible]);
  useEffect(() => {
    if (!visible) setConfirm(false);
  }, [visible]);
  useEffect(() => {
    const thumb = activeThumb.current;
    const strip = thumb?.parentElement;
    if (!thumb || !strip) return;
    const visible = strip.getBoundingClientRect();
    const bounds = thumb.getBoundingClientRect();
    if (bounds.left < visible.left) strip.scrollLeft -= visible.left - bounds.left + 3;
    if (bounds.right > visible.right) strip.scrollLeft += bounds.right - visible.right + 3;
  }, [activeId]);

  const openPhoto = (photo: AlbumPhoto, event?: MouseEvent<HTMLButtonElement>) => {
    if (photo.id === activeId) return;
    if (event && !active) opener.current = event.currentTarget;
    setImageUrl('');
    setActiveId(photo.id);
  };
  const backToGallery = () => {
    setActiveId('');
    setImageUrl('');
  };
  const filterPhotos = (onlyAnnotated: boolean) => {
    setAnnotatedOnly(onlyAnnotated);
    setShown(pageSize);
  };
  const clearDraft = (id: string, savedDraft?: string) => {
    setDrafts((current) => {
      if (current[id] === undefined || (savedDraft !== undefined && current[id] !== savedDraft)) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  const savePhoto = async (photo: AlbumPhoto, value: string, selected?: boolean) => {
    if (!canWrite || busy) return;
    if (value.length > noteLimit) {
      setError('Ghi chú cho studio tối đa 2.000 ký tự.');
      return;
    }
    if (selected && album?.limit && matchingCount >= album.limit) {
      setError(
        'Album nhận tối đa ' + album.limit + ' ảnh cần chỉnh. Hãy bỏ một yêu cầu để thêm ảnh khác.',
      );
      return;
    }
    const draftToSave = drafts[photo.id];
    const next = await command('photo', {
      photoId: photo.id,
      note: value.trim(),
      ...(selected === undefined ? {} : { selected }),
    });
    if (next && draftToSave !== undefined) clearDraft(photo.id, draftToSave);
  };
  const sendRequests = async () => {
    if (!canRequest || !matchingCount || missingDraft) return;
    if (await command('finalize')) {
      setConfirm(false);
      filterPhotos(false);
      setFolder('');
    }
  };
  const ratioOf = (photo: GalleryPhoto) => {
    const image = photo.replacement ?? photo;
    const ratio = image.width / image.height;
    return ratios[imageKey(photo)] ?? (ratio > 0 && Number.isFinite(ratio) ? ratio : fallbackRatio);
  };
  const measureImage = (photo: GalleryPhoto, { target }: SyntheticEvent) => {
    if (!(target instanceof HTMLImageElement) || !target.naturalHeight) return;
    const ratio = target.naturalWidth / target.naturalHeight;
    if (ratio > 0 && ratio !== ratioOf(photo))
      setRatios((current) => ({ ...current, [imageKey(photo)]: ratio }));
  };

  const sent = !!album.finalizedAt;
  const requestStatus = canRequest
    ? 'Đang nhận yêu cầu'
    : sent
      ? 'Đã gửi yêu cầu'
      : 'Đã đóng nhận yêu cầu';
  const editedStatus = !photos.length
    ? ''
    : version !== latest
      ? 'Bản trước'
      : canReview
        ? 'Chờ nghiệm thu'
        : 'Đã bàn giao';
  const instruction = original
    ? 'Bạn nhận toàn bộ ảnh gốc qua Google Drive. ' +
      (canRequest
        ? 'Mở ảnh nào cần chỉnh để thêm yêu cầu.'
        : album.replacements?.length
          ? 'Bản chỉnh đã bàn giao xuất hiện tại vị trí của ảnh gốc.'
          : sent
            ? 'Đã gửi yêu cầu chỉnh sửa.'
            : '')
    : canReview
      ? 'Mở từng ảnh để xem lớn và góp ý.'
      : version && version !== latest
        ? 'Bạn đang xem lại bản bàn giao trước.'
        : '';
  const Heading = embedded ? 'h2' : 'h1';
  const messages = <AlbumMessages session={session} viewing={viewing} />;
  return (
    <div data-album-panel={original ? 'original' : 'edited'} hidden={!visible}>
      <div ref={gallery} tabIndex={-1} hidden={viewing}>
        <div className="customer-drive-album__intro">
          {cover && (
            <div className="customer-drive-album__cover">
              <AlbumImage
                client={client}
                photo={cover.replacement ?? cover}
                thumbnail
                thumbnailCache={thumbnailCache}
              />
            </div>
          )}
          <div className="customer-drive-album__identity">
            {(!embedded || original) && <Heading>{album.title}</Heading>}
            <p className="customer-drive-album__meta">
              {!original && !!version && <>Bản {version} · </>}
              {photos.filter((photo) => photo.available || photo.replacement).length} ảnh
            </p>
            {instruction && <p>{instruction}</p>}
          </div>
          {(original || editedStatus) && (
            <span className="customer-drive-album__status">
              {original ? requestStatus : editedStatus}
            </span>
          )}
        </div>
        {navigation}
        {!viewing && !confirm && messages}
        <div className="customer-drive-album__toolbar">
          <div className="customer-drive-album__filters" role="group" aria-label="Lọc ảnh">
            <button type="button" aria-pressed={!annotatedOnly} onClick={() => filterPhotos(false)}>
              Tất cả ({photos.length})
            </button>
            <button type="button" aria-pressed={annotatedOnly} onClick={() => filterPhotos(true)}>
              {original ? 'Có yêu cầu' : 'Có góp ý'} ({matchingCount})
            </button>
          </div>
          <div className="customer-drive-album__tools">
            {original && !!album.folders.length && (
              <CustomerSelect
                aria-label="Thư mục"
                value={folder}
                onChange={(event) => {
                  setFolder(event.target.value);
                  setShown(pageSize);
                }}
              >
                <option value="">Tất cả thư mục</option>
                {album.folders.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </CustomerSelect>
            )}
            {!original && !embedded && versions.length > 1 && (
              <CustomerSelect
                aria-label="Phiên bản ảnh đã chỉnh"
                value={version}
                onChange={(event) => onVersionChange(Number(event.target.value))}
              >
                {versions.map((item) => (
                  <option key={item} value={item}>
                    Bản {item}
                    {item === latest ? ' · Mới nhất' : ''}
                  </option>
                ))}
              </CustomerSelect>
            )}
          </div>
        </div>
        <div className="customer-drive-album__grid" role="group" aria-label="Danh sách ảnh">
          {Array.from(
            { length: Math.ceil(Math.min(shown, filtered.length) / columns) },
            (_, index) => {
              const start = index * columns;
              const row = filtered.slice(start, Math.min(start + columns, shown));
              const weights = Array.from({ length: columns }, (_, column) =>
                row[column] ? ratioOf(row[column]) : fallbackRatio,
              );
              const sum = weights.reduce((total, weight) => total + weight, 0);
              const gridTemplateColumns = weights
                .map((weight) => 'minmax(0, ' + (weight / sum) * columns + 'fr)')
                .join(' ');
              return (
                <ul
                  key={row[0].id}
                  className="customer-drive-album__row"
                  style={{ gridTemplateColumns }}
                >
                  {row.map((photo) => {
                    const hasNote = annotated(photo);
                    return (
                      <li key={photo.id}>
                        <button
                          type="button"
                          className="customer-drive-album__photo"
                          style={{ '--photo-ratio': ratioOf(photo) } as CSSProperties}
                          aria-label={'Xem ' + photo.name}
                          onClick={(event) => openPhoto(photo, event)}
                          onLoadCapture={(event) => measureImage(photo, event)}
                        >
                          <AlbumImage
                            client={client}
                            photo={photo.replacement ?? photo}
                            thumbnail
                            thumbnailCache={thumbnailCache}
                          />
                        </button>
                        <div className="customer-drive-album__caption">
                          <span className="customer-drive-album__filename" title={photo.name}>
                            {photo.name}
                          </span>
                          {original &&
                            (photo.replacement || (photo.available && (hasNote || canRequest))) && (
                              <button
                                type="button"
                                className={
                                  'customer-drive-album__request-link' +
                                  (hasNote ? ' has-note' : '')
                                }
                                aria-label={
                                  (photo.replacement
                                    ? 'Xem bản chỉnh của '
                                    : hasNote
                                      ? 'Xem yêu cầu chỉnh sửa '
                                      : 'Yêu cầu chỉnh sửa ') + photo.name
                                }
                                onClick={(event) => openPhoto(photo, event)}
                              >
                                {photo.replacement ? (
                                  <>
                                    <Check size={15} aria-hidden="true" /> Đã chỉnh
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare size={15} aria-hidden="true" />{' '}
                                    {hasNote ? 'Có yêu cầu' : 'Yêu cầu chỉnh'}
                                  </>
                                )}
                              </button>
                            )}
                          {!original && hasNote && (
                            <span className="customer-drive-album__noted" title="Có góp ý">
                              <MessageSquare size={15} aria-hidden="true" />
                              <span className="sr-only">Có góp ý</span>
                            </span>
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
            {!original && !photos.length
              ? 'Studio chưa bàn giao ảnh đã chỉnh.'
              : annotatedOnly
                ? original
                  ? 'Chưa có ảnh nào có yêu cầu chỉnh sửa.'
                  : 'Chưa có ảnh nào có góp ý.'
                : 'Chưa có ảnh phù hợp.'}
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
        {visible && canRequest && !viewing && (
          <footer className="customer-drive-album__send">
            <div className="customer-drive-album__width">
              <div className="customer-drive-album__send-summary">
                <span>
                  <MessageSquare size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong aria-live="polite">{matchingCount} ảnh có yêu cầu</strong>
                  {missingDraft ? (
                    <button type="button" onClick={(event) => openPhoto(missingDraft, event)}>
                      Xem ghi chú chưa lưu
                    </button>
                  ) : (
                    !!album.limit && <p>Tối đa {album.limit} ảnh cần chỉnh</p>
                  )}
                </div>
              </div>
              <Dialog
                open={confirm}
                onOpenChange={(open) => {
                  if (!busy) setConfirm(open);
                }}
              >
                <DialogTrigger asChild>
                  <CustomerButton type="button" disabled={busy || !matchingCount || !!missingDraft}>
                    Gửi yêu cầu chỉnh sửa
                  </CustomerButton>
                </DialogTrigger>
                <DialogContent className="customer-tokens customer-drive-album__confirm">
                  <DialogTitle>Gửi yêu cầu chỉnh sửa cho {matchingCount} ảnh?</DialogTitle>
                  <DialogDescription>
                    Studio sẽ nhận các yêu cầu chỉnh sửa cho ảnh trong danh sách. Nếu cần sửa yêu
                    cầu đã gửi, hãy nhờ studio mở lại.
                  </DialogDescription>
                  {messages}
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
                      disabled={busy || !matchingCount || !!missingDraft}
                      onClick={() => void sendRequests()}
                    >
                      Gửi yêu cầu
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
          aria-label={original && !active.replacement ? 'Xem ảnh gốc' : 'Xem ảnh đã chỉnh'}
          onKeyDown={(event) => {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              backToGallery();
            }
            if (event.target instanceof HTMLTextAreaElement) return;
            const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
            if (step && viewPhotos[activeIndex + step]) {
              event.preventDefault();
              openPhoto(viewPhotos[activeIndex + step]);
            }
          }}
        >
          <CustomerButton
            type="button"
            ref={backButton}
            variant="text"
            className="app-back-link customer-drive-album__back"
            onClick={backToGallery}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Quay lại album
          </CustomerButton>
          <header className="customer-drive-album__viewer-heading">
            <div>
              <Heading>{original && !active.replacement ? 'Ảnh gốc' : 'Ảnh đã chỉnh'}</Heading>
              <p className="customer-drive-album__meta">
                {album.title}
                {active.replacement
                  ? ' · Bản ' + active.replacement.deliveryVersion
                  : !original && ' · Bản ' + version}
              </p>
            </div>
            {imageUrl && (
              <CustomerButton asChild variant="secondary">
                <a
                  href={imageUrl}
                  download={
                    active.replacement ? active.name.replace(/\.[^.]+$/, '') + '.jpg' : active.name
                  }
                >
                  <Download size={17} aria-hidden="true" /> Tải ảnh
                </a>
              </CustomerButton>
            )}
          </header>
          <div className="customer-drive-album__viewer-layout">
            <div className="customer-drive-album__viewer-photos">
              <div className="customer-drive-album__stage">
                <AlbumImage
                  key={active.id}
                  client={client}
                  photo={active.replacement ?? active}
                  onUrl={setImageUrl}
                />
                <button
                  type="button"
                  className="customer-drive-album__previous"
                  aria-label="Ảnh trước"
                  disabled={activeIndex <= 0}
                  onClick={() => openPhoto(viewPhotos[activeIndex - 1])}
                >
                  <ChevronLeft size={21} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="customer-drive-album__next"
                  aria-label="Ảnh tiếp theo"
                  disabled={activeIndex >= viewPhotos.length - 1}
                  onClick={() => openPhoto(viewPhotos[activeIndex + 1])}
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
                      ref={photo.id === active.id ? activeThumb : undefined}
                      aria-current={photo.id === active.id || undefined}
                      aria-label={
                        'Xem ' +
                        photo.name +
                        (annotated(photo) ? (original ? ', có yêu cầu' : ', có góp ý') : '')
                      }
                      onClick={() => openPhoto(photo)}
                    >
                      <AlbumImage
                        client={client}
                        photo={photo.replacement ?? photo}
                        thumbnail
                        thumbnailCache={thumbnailCache}
                      />
                      {annotated(photo) && (
                        <span>
                          <MessageSquare size={13} aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              )}
            </div>
            <aside className="customer-drive-album__feedback">
              <h2>{original ? 'Yêu cầu chỉnh sửa' : 'Góp ý ảnh này'}</h2>
              <p className="customer-drive-album__meta">
                {active.name}
                {!original && ' · Bản ' + version}
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void savePhoto(active, note, original && !active.selected ? true : undefined);
                }}
              >
                <label htmlFor={noteId}>
                  {original ? 'Ghi chú cho studio' : 'Bạn muốn studio chỉnh gì?'}
                </label>
                {original && canWrite && (
                  <span className="customer-drive-album__optional">Tùy chọn</span>
                )}
                <CustomerTextarea
                  id={noteId}
                  aria-describedby={noteId + '-hint'}
                  readOnly={!canWrite}
                  value={note}
                  rows={5}
                  maxLength={noteLimit}
                  placeholder={
                    canWrite ? 'Ví dụ: Nhờ studio tăng sáng nhẹ phần mặt.' : 'Chưa có ghi chú.'
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setDrafts((current) => ({ ...current, [active.id]: value }));
                  }}
                />
                <div className="customer-drive-album__note-status">
                  <span role="status">
                    {dirty
                      ? 'Chưa lưu'
                      : annotated(active)
                        ? original
                          ? sent
                            ? 'Đã gửi yêu cầu'
                            : 'Đã thêm yêu cầu'
                          : 'Đã lưu'
                        : ''}
                  </span>
                  <span>{note.length.toLocaleString('vi-VN')} / 2.000</span>
                </div>
                {canWrite && (
                  <CustomerButton
                    type="submit"
                    fullWidth
                    disabled={busy || (!dirty && (!original || active.selected))}
                  >
                    {busy
                      ? 'Đang lưu…'
                      : original
                        ? active.selected
                          ? 'Lưu thay đổi'
                          : 'Thêm yêu cầu'
                        : 'Lưu góp ý'}
                  </CustomerButton>
                )}
                {dirty && (
                  <CustomerButton
                    type="button"
                    variant="text"
                    fullWidth
                    disabled={busy}
                    onClick={() => clearDraft(active.id)}
                  >
                    Bỏ thay đổi ghi chú
                  </CustomerButton>
                )}
                {canWrite && original && active.selected && (
                  <CustomerButton
                    type="button"
                    variant="text"
                    fullWidth
                    disabled={busy}
                    onClick={() => void savePhoto(active, '', false)}
                  >
                    Bỏ yêu cầu
                  </CustomerButton>
                )}
                <p className="customer-drive-album__hint" id={noteId + '-hint'}>
                  {original
                    ? canWrite
                      ? 'Bạn có thể gửi các yêu cầu cùng lúc từ album.'
                      : sent
                        ? 'Bạn đã gửi danh sách yêu cầu của album.'
                        : 'Studio đã đóng nhận yêu cầu cho ảnh này.'
                    : canWrite
                      ? 'Studio sẽ thấy góp ý này trên đúng ảnh đang xem.'
                      : 'Góp ý được mở ở bản mới nhất đang chờ nghiệm thu.'}
                </p>
              </form>
              {messages}
              {!!matchingCount && (
                <div className="customer-drive-album__feedback-summary">
                  <MessageSquare size={18} aria-hidden="true" />{' '}
                  <span>
                    {matchingCount} ảnh {original ? 'có yêu cầu' : 'đã góp ý'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFolder('');
                      filterPhotos(true);
                      backToGallery();
                    }}
                  >
                    Xem danh sách
                  </button>
                </div>
              )}
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
