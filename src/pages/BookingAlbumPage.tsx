import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  albumClient,
  albumError,
  type BookingAlbum,
  type AlbumPhoto,
} from '@/services/bookingAlbumService';
import { bookingWorkflowService, createWorkflowRequestId } from '@/services/bookingWorkflowService';
import '../styles/booking-album.css';

type Client = ReturnType<typeof albumClient>;
function AlbumImage({
  client,
  photo,
  thumbnail = false,
  onUrl,
}: {
  client: Client;
  photo: AlbumPhoto;
  thumbnail?: boolean;
  onUrl?: (url: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!thumbnail);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: '', url: '', error: '' });
  const key = `${photo.id}:${photo.sourceVersion || ''}:${thumbnail}`;
  useEffect(() => {
    if (!thumbnail || !window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, [thumbnail]);
  useEffect(() => {
    if (!visible || !photo.available) return;
    const controller = new AbortController();
    let alive = true,
      url = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    setResult({ key, url: '', error: '' });
    onUrl?.('');
    const load = async (retry = 0) => {
      try {
        const blob = await client.image(photo.id, thumbnail, controller.signal);
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setResult({ key, url, error: '' });
        onUrl?.(url);
      } catch (error) {
        if (!alive) return;
        const response = (error as { response?: { status: number; data: Blob } }).response;
        if (response?.status === 429 && retry < 4) {
          timer = setTimeout(() => void load(retry + 1), 1200 * (retry + 1));
          return;
        }
        let message = 'Không tải được ảnh. Thử lại.';
        if (response?.data instanceof Blob) {
          try {
            message = JSON.parse(await response.data.text()).message || message;
          } catch {
            /* use fallback */
          }
        }
        if (alive) setResult({ key, url: '', error: message });
      }
    };
    void load();
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [client, photo.id, photo.available, thumbnail, visible, key, attempt, onUrl]);
  return (
    <div ref={element} className={`album-image ${thumbnail ? 'album-image--thumb' : ''}`}>
      {!photo.available ? (
        <span>Ảnh không còn trong thư mục</span>
      ) : result.key === key && result.url ? (
        <img src={result.url} alt={photo.name} />
      ) : result.key === key && result.error ? (
        <div role="status">
          <p>{result.error}</p>
          {!thumbnail && (
            <button type="button" onClick={() => setAttempt((v) => v + 1)}>
              Thử tải lại
            </button>
          )}
        </div>
      ) : (
        <span role="status">Đang tải ảnh…</span>
      )}
    </div>
  );
}
const splitFolders = (text: string) =>
  text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function BookingAlbumPage({
  staff = false,
  account = false,
  embedded = false,
  section,
  deliveryVersion = 0,
  canCommentDelivery,
  workflowVersion,
  lifecycle,
  onAlbumChange,
}: {
  staff?: boolean;
  account?: boolean;
  embedded?: boolean;
  section?: 'selection' | 'delivery';
  deliveryVersion?: number;
  onAlbumChange?: (album: BookingAlbum | null) => void;
  canCommentDelivery?: boolean;
  workflowVersion?: number;
  lifecycle?: string;
}) {
  const { id = '', publicId = '' } = useParams();
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('access') || '';
  const identity = staff || account ? id : `${publicId}:${token}`;
  const client = useMemo(
    () =>
      account ? albumClient(false, id, '', true) : albumClient(staff, staff ? id : publicId, token),
    [staff, account, id, publicId, token],
  );
  const [album, setAlbum] = useState<BookingAlbum | null>(null);
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(''),
    [limit, setLimit] = useState('0'),
    [folders, setFolders] = useState(''),
    [deliveryFolders, setDeliveryFolders] = useState('');
  const [tab, setTab] = useState(0),
    [filter, setFilter] = useState('all'),
    [folder, setFolder] = useState(''),
    [shown, setShown] = useState(60);
  const [selectedId, setSelectedId] = useState(''),
    [imageUrl, setImageUrl] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({}),
    [confirm, setConfirm] = useState(false),
    [shareUrl, setShareUrl] = useState('');
  const [exportText, setExportText] = useState(''),
    [extension, setExtension] = useState(true),
    [revisionNote, setRevisionNote] = useState('');
  const inflight = useRef(false),
    keys = useRef(new Map<string, string>()),
    currentIdentity = useRef(identity);
  useLayoutEffect(() => {
    currentIdentity.current = identity;
  }, [identity]);
  const callback = useRef(onAlbumChange);
  useLayoutEffect(() => {
    callback.current = onAlbumChange;
  }, [onAlbumChange]);
  const apply = useCallback((next: BookingAlbum | null) => {
    setAlbum(next);
    callback.current?.(next);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoaded(false);
    setAlbum(null);
    setError('');
    setShareUrl('');
    setDrafts({});
    setSelectedId('');
    keys.current.clear();
    void client
      .get(controller.signal)
      .then((next) => {
        if (!active) return;
        apply(next);
        setTitle(next?.title || 'Album chọn ảnh');
        setLimit(String(next?.limit || 0));
        setFolders(
          next?.folders
            .map((f) => f.url || `https://drive.google.com/drive/folders/${f.id}`)
            .join('\n') || '',
        );
        setTab(
          next?.latestDeliveryVersion && next.deliveryVersions.includes(next.latestDeliveryVersion)
            ? next.latestDeliveryVersion
            : 0,
        );
      })
      .catch((e) => {
        if (active) setError(albumError(e));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [client, apply]);
  useEffect(() => {
    if (embedded && loaded) setTab(section === 'selection' ? 0 : deliveryVersion || -1);
  }, [embedded, section, deliveryVersion, loaded]);
  const refresh = async () => {
    try {
      const next = await client.get();
      if (currentIdentity.current === identity) {
        apply(next);
        setError('');
      }
    } catch (e) {
      setError(albumError(e));
    }
  };
  const command = async (operation: string, data: Record<string, unknown> = {}) => {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const payload = { ...data, expectedVersion: album?.version || 0 };
    const signature = JSON.stringify([operation, payload]);
    if (!keys.current.has(signature)) keys.current.set(signature, createWorkflowRequestId());
    try {
      const next = await client.command(operation, payload, keys.current.get(signature)!);
      if (currentIdentity.current !== identity) return;
      apply(next);
      keys.current.delete(signature);
      setNotice('Đã lưu.');
      if (next.token)
        setShareUrl(`${window.location.origin}/albums/${next.publicId}#access=${next.token}`);
      if (operation === 'revoke') setShareUrl('');
      if (operation === 'photo' && typeof data.photoId === 'string' && data.note !== undefined)
        setDrafts((d) => {
          const copy = { ...d };
          if (copy[data.photoId as string] === data.note) delete copy[data.photoId as string];
          return copy;
        });
      if (operation === 'finalize') setConfirm(false);
    } catch (e) {
      if (currentIdentity.current === identity) setError(albumError(e));
    } finally {
      inflight.current = false;
      if (currentIdentity.current === identity) setBusy(false);
    }
  };
  const workflowAction = async (
    type: 'progress.update' | 'delivery.revision.start',
    data: Record<string, unknown>,
  ) => {
    if (!album || album.workflowVersion === undefined || inflight.current) return;
    const expectedVersion = Math.max(workflowVersion ?? 0, album.workflowVersion);
    inflight.current = true;
    setBusy(true);
    setError('');
    const signature = JSON.stringify([type, expectedVersion, data]);
    if (!keys.current.has(signature)) keys.current.set(signature, createWorkflowRequestId());
    try {
      await bookingWorkflowService.act(
        id,
        expectedVersion,
        type,
        data,
        keys.current.get(signature),
      );
      keys.current.delete(signature);
      await refresh();
      setNotice(
        type === 'progress.update' && data.status === 'editing'
          ? 'Đã chuyển sang hậu kỳ. Bạn có thể chuẩn bị bản bàn giao mới.'
          : type === 'progress.update'
            ? 'Đã gửi bản bàn giao mới trên cùng link album.'
            : 'Đã ghi nhận bắt đầu chỉnh lại. Chuyển sang hậu kỳ để chuẩn bị bản mới.',
      );
    } catch (e) {
      setError(albumError(e));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  };
  const allPhotos = album?.photos.filter((p) => p.deliveryVersion === tab) || [];
  const filtered = allPhotos.filter(
    (p) =>
      (!folder || p.folderId === folder) &&
      (filter === 'selected' ? p.selected : filter === 'notes' ? !!p.note : true),
  );
  const selected = allPhotos.find((p) => p.id === selectedId);
  const canSelect = !staff && album?.canSelect && tab === 0;
  const canNote =
    canSelect ||
    (!staff &&
      tab > 0 &&
      tab === album?.latestDeliveryVersion &&
      (canCommentDelivery ?? album.canCommentDelivery));
  const chosen =
    album?.photos.filter((p) => p.deliveryVersion === 0 && p.available && p.selected).length || 0;
  const pendingDrafts = Object.keys(drafts).some(
    (photoId) => drafts[photoId] !== album?.photos.find((p) => p.id === photoId)?.note,
  );
  const cover = album?.photos.find(
    (p) => p.deliveryVersion === 0 && p.driveId === album.coverId && p.available,
  );
  useEffect(() => {
    setShown(60);
    setFolder('');
    setFilter('all');
    setSelectedId('');
  }, [tab]);
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId('');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected]);
  const setModalUrl = useCallback((url: string) => setImageUrl(url), []);
  const dialogOpen = !!selectedId || confirm;
  useEffect(() => {
    if (!dialogOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('.album-confirm, .album-viewer');
    const elements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], textarea:not([readonly]), input, select',
        ) || [],
      );
    elements()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId('');
        setConfirm(false);
      }
      if (event.key !== 'Tab') return;
      const items = elements();
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [dialogOpen]);
  const exportNames = async (round?: number) => {
    setError('');
    try {
      setExportText((await client.export(extension, round)).text);
    } catch (e) {
      setError(albumError(e));
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Đã sao chép.');
    } catch {
      setError('Chưa sao chép được. Bạn có thể chọn và sao chép nội dung trong ô.');
    }
  };
  const downloadText = () => {
    const url = URL.createObjectURL(new Blob([exportText], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'anh-da-chon.txt';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const Container = embedded ? 'section' : 'main';
  return (
    <Container className={`album-page${embedded ? ' album-page--embedded' : ''}`}>
      {!embedded && (
        <header className="album-header">
          <div>
            <span className="album-eyebrow">
              {staff ? 'Không gian làm việc của studio' : 'Bộ ảnh dành cho bạn'}
            </span>
            <h1>{album?.title || 'Album ảnh'}</h1>
            <p>Chọn khoảnh khắc bạn muốn giữ lại.</p>
          </div>
          {staff && (
            <Link className="album-button album-button--quiet" to={`/workflow-bookings/${id}`}>
              <ArrowLeft size={16} /> Hồ sơ đơn
            </Link>
          )}
        </header>
      )}
      <div className="album-messages" aria-live="polite">
        {error && (
          <p role="alert" className="album-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
      {!loaded ? (
        <p role="status">Đang mở album…</p>
      ) : !staff && !album ? (
        embedded && section === 'delivery' ? null : (
          <div className="album-empty">
            <ImageIcon />
            <h2>{account ? 'Studio chưa mở album chọn ảnh' : 'Album chưa khả dụng'}</h2>
            <p>
              {account
                ? 'Ảnh sẽ xuất hiện ở đây khi studio mở cho bạn lựa chọn.'
                : 'Kiểm tra lại link đầy đủ hoặc liên hệ studio.'}
            </p>
          </div>
        )
      ) : (
        <>
          {staff && (
            <section className="album-management" aria-label="Quản lý album">
              {(!embedded || section === 'selection') && (
                <>
                  <div className="album-panel">
                    <h2>Album chọn ảnh</h2>
                    <label>
                      Tên album
                      <input
                        value={title}
                        maxLength={160}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      Thư mục Drive · mỗi link một dòng
                      <textarea
                        value={folders}
                        onChange={(e) => setFolders(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        rows={3}
                      />
                    </label>
                    <p className="album-hint">
                      Bật “Bất kỳ ai có đường liên kết” trên Drive. Chỉ ảnh trực tiếp trong từng thư
                      mục được đưa vào album.
                    </p>
                    <label>
                      Số ảnh được chọn · 0 là không giới hạn
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                      />
                    </label>
                    <div className="album-actions">
                      <button
                        disabled={busy}
                        onClick={() =>
                          void command('configure', {
                            title,
                            limit: Number(limit),
                            folders: splitFolders(folders),
                          })
                        }
                      >
                        Lưu và lấy ảnh
                      </button>
                      {album && (
                        <button disabled={busy} onClick={() => void command('sync')}>
                          Cập nhật từ Drive
                        </button>
                      )}
                    </div>
                  </div>
                  {album && (
                    <div className="album-panel">
                      <h2>Chia sẻ và lựa chọn</h2>
                      <p>
                        {album.status === 'draft'
                          ? 'Bản nháp · khách chưa xem được'
                          : album.status === 'open'
                            ? 'Đang mở chọn ảnh'
                            : 'Đã khóa lựa chọn'}
                      </p>
                      <div className="album-actions">
                        <button
                          disabled={busy || album.status === 'open'}
                          onClick={() =>
                            void command(album.status === 'draft' ? 'publish' : 'reopen')
                          }
                        >
                          {album.status === 'draft' ? 'Xuất bản album' : 'Mở lại lựa chọn'}
                        </button>
                        <button
                          disabled={busy || album.status !== 'open'}
                          onClick={() => void command('close')}
                        >
                          Đóng lựa chọn
                        </button>
                        <button disabled={busy} onClick={() => void command('share')}>
                          {album.shared ? 'Tạo link mới (thu hồi link cũ)' : 'Tạo link cho khách'}
                        </button>
                        <button
                          disabled={busy || !album.shared}
                          onClick={() => void command('revoke')}
                        >
                          Thu hồi link
                        </button>
                      </div>
                      {shareUrl && (
                        <label>
                          Link khách · lưu lại để gửi
                          <input readOnly value={shareUrl} />
                          <button onClick={() => void copy(shareUrl)}>Sao chép link</button>
                        </label>
                      )}
                      <label>
                        <input
                          type="checkbox"
                          checked={extension}
                          onChange={(e) => setExtension(e.target.checked)}
                        />{' '}
                        Giữ đuôi file
                      </label>
                      <button disabled={busy} onClick={() => void exportNames()}>
                        Lấy tên file đã chọn
                      </button>
                      {exportText && (
                        <>
                          <textarea
                            aria-label="Tên file đã chọn"
                            readOnly
                            value={exportText}
                            rows={4}
                          />
                          <div className="album-actions">
                            <button onClick={() => void copy(exportText)}>
                              Sao chép danh sách
                            </button>
                            <button onClick={downloadText}>Tải TXT</button>
                          </div>
                        </>
                      )}
                      {!!album.skipped?.length && (
                        <details>
                          <summary>{album.skipped.length} tệp được bỏ qua</summary>
                          <ul>
                            {album.skipped.map((name, index) => (
                              <li key={index}>{name}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {!!album.selectionHistory?.length && (
                        <details>
                          <summary>Lịch sử chốt ({album.selectionHistory.length})</summary>
                          {album.selectionHistory.map((entry, index) => (
                            <div key={index}>
                              <p>
                                {new Date(entry.at).toLocaleString('vi-VN')} · {entry.count} ảnh
                              </p>
                              <button disabled={busy} onClick={() => void exportNames(entry.round)}>
                                Lấy tên file lần chốt {entry.round}
                              </button>
                            </div>
                          ))}
                        </details>
                      )}
                    </div>
                  )}
                </>
              )}
              {album && (!embedded || section === 'delivery') && (
                <div className="album-panel">
                  <h2>Giao ảnh đã chỉnh</h2>
                  <label>
                    Thư mục bản bàn giao · mỗi link một dòng
                    <textarea
                      value={deliveryFolders}
                      onChange={(e) => setDeliveryFolders(e.target.value)}
                      rows={3}
                    />
                  </label>
                  <p className="album-hint">
                    Dùng thư mục riêng cho mỗi phiên bản. Giữ nguyên ảnh đã giao để khách xem lại.
                  </p>
                  <div className="album-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        void command('delivery-sync', { folders: splitFolders(deliveryFolders) })
                      }
                    >
                      Lấy ảnh đã chỉnh
                    </button>
                    <button
                      disabled={
                        busy || !album.photos.some((p) => p.deliveryVersion === -1 && p.available)
                      }
                      onClick={() => setTab(-1)}
                    >
                      Xem bản chuẩn bị giao
                    </button>
                    <button
                      disabled={
                        busy ||
                        (lifecycle ?? album.lifecycle) !== 'editing' ||
                        !album.photos.some((p) => p.deliveryVersion === -1 && p.available)
                      }
                      onClick={() =>
                        void workflowAction('progress.update', {
                          status: 'delivered',
                          driveAlbum: true,
                          albumVersion: album.version,
                        })
                      }
                    >
                      Gửi bản bàn giao mới
                    </button>
                  </div>
                  {(lifecycle ?? album.lifecycle) === 'delivered' && (
                    <>
                      <label>
                        Lý do bắt đầu chỉnh lại
                        <textarea
                          value={revisionNote}
                          maxLength={2000}
                          onChange={(e) => setRevisionNote(e.target.value)}
                        />
                      </label>
                      <button
                        disabled={busy || !revisionNote.trim()}
                        onClick={() =>
                          void workflowAction('delivery.revision.start', {
                            deliveryVersion: album.latestDeliveryVersion,
                            note: revisionNote,
                          })
                        }
                      >
                        Bắt đầu chỉnh lại
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
          {album &&
            (!embedded ||
              section === 'selection' ||
              tab === -1 ||
              album.deliveryVersions.includes(tab)) && (
              <>
                {!staff && cover && tab === 0 && (
                  <div className="album-cover">
                    <AlbumImage client={client} photo={cover} thumbnail />
                    <div>
                      <span>ALBUM CỦA BẠN</span>
                      <h2>{album.title}</h2>
                      <p>
                        {allPhotos.filter((p) => p.available).length} khoảnh khắc · cùng bạn chọn
                        ảnh
                      </p>
                    </div>
                  </div>
                )}
                {!embedded && (
                  <nav className="album-tabs" aria-label="Các phần ảnh">
                    <button aria-pressed={tab === 0} onClick={() => setTab(0)}>
                      Ảnh chọn
                    </button>
                    {album.deliveryVersions.map((v) => (
                      <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)}>
                        Ảnh đã chỉnh · Bản {v}
                      </button>
                    ))}
                    {staff && album.photos.some((p) => p.deliveryVersion === -1) && (
                      <button aria-pressed={tab === -1} onClick={() => setTab(-1)}>
                        Bản chuẩn bị giao
                      </button>
                    )}
                  </nav>
                )}
                <div className="album-toolbar">
                  <div>
                    <strong>
                      {tab === 0
                        ? `${chosen}${album.limit ? `/${album.limit}` : ''} ảnh đã chọn`
                        : `${allPhotos.length} ảnh`}
                    </strong>
                    <p>
                      {tab === 0 && album.status === 'closed'
                        ? 'Lựa chọn đã khóa. Liên hệ studio nếu muốn thay đổi.'
                        : tab > 0 && tab !== album.latestDeliveryVersion
                          ? 'Bạn đang xem bản cũ · chỉ xem'
                          : tab === -1
                            ? 'Khách chưa xem được bản này'
                            : 'Bấm vào ảnh để xem lớn và ghi chú'}
                    </p>
                  </div>
                  <div className="album-actions">
                    <label className="album-filter">
                      Lọc ảnh
                      <select
                        aria-label="Lọc ảnh"
                        value={filter}
                        onChange={(e) => {
                          setFilter(e.target.value);
                          setShown(60);
                        }}
                      >
                        <option value="all">Tất cả</option>
                        {tab === 0 && <option value="selected">Đã chọn</option>}
                        <option value="notes">Có ghi chú</option>
                      </select>
                    </label>
                    {tab === 0 && (
                      <label className="album-filter">
                        Thư mục
                        <select
                          aria-label="Thư mục"
                          value={folder}
                          onChange={(e) => {
                            setFolder(e.target.value);
                            setShown(60);
                          }}
                        >
                          <option value="">Tất cả thư mục</option>
                          {album.folders.map((f) => (
                            <option value={f.id} key={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button disabled={busy} onClick={() => void refresh()}>
                      Tải lại album
                    </button>
                  </div>
                </div>
                <section className="album-grid" aria-label="Danh sách ảnh">
                  {filtered.slice(0, shown).map((photo) => (
                    <article
                      className={`album-card ${photo.selected ? 'album-card--selected' : ''}`}
                      key={photo.id}
                    >
                      <button
                        className="album-card__open"
                        onClick={() => {
                          setImageUrl('');
                          setSelectedId(photo.id);
                        }}
                        aria-label={`Xem ${photo.name}`}
                      >
                        <AlbumImage client={client} photo={photo} thumbnail />
                      </button>
                      <div className="album-card__caption">
                        <span title={photo.name}>{photo.name}</span>
                        {tab === 0 && (
                          <button
                            className="album-heart"
                            aria-label={`${photo.selected ? 'Bỏ chọn' : 'Chọn'} ${photo.name}`}
                            aria-pressed={photo.selected}
                            disabled={!canSelect || busy || !photo.available}
                            onClick={() =>
                              void command('photo', {
                                photoId: photo.id,
                                selected: !photo.selected,
                              })
                            }
                          >
                            <Heart size={18} fill={photo.selected ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                      {photo.note && <p className="album-card__note">{photo.note}</p>}
                      {staff && tab === 0 && photo.available && (
                        <button
                          className="album-cover-button"
                          disabled={busy}
                          onClick={() => void command('cover', { coverId: photo.driveId })}
                        >
                          Đặt làm ảnh bìa
                        </button>
                      )}
                    </article>
                  ))}
                </section>
                {!filtered.length && <p className="album-empty">Chưa có ảnh phù hợp.</p>}
                {filtered.length > shown && (
                  <button className="album-more" onClick={() => setShown((v) => v + 60)}>
                    Xem thêm ảnh ({filtered.length - shown})
                  </button>
                )}
                {canSelect && (
                  <footer className="album-bottom">
                    <div>
                      <strong>{chosen} ảnh đã chọn</strong>
                      <span>
                        {pendingDrafts
                          ? 'Bạn còn ghi chú chưa lưu'
                          : busy
                            ? 'Đang lưu…'
                            : 'Lựa chọn đã lưu trên album'}
                      </span>
                    </div>
                    <button
                      disabled={busy || !chosen || pendingDrafts}
                      onClick={() => setConfirm(true)}
                    >
                      <Check size={18} /> Hoàn tất lựa chọn
                    </button>
                  </footer>
                )}
                {confirm && (
                  <div
                    className="album-confirm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="album-confirm-title"
                  >
                    <div>
                      <h2 id="album-confirm-title">Chốt {chosen} ảnh đã chọn?</h2>
                      <p>
                        Sau khi gửi, danh sách chọn và ghi chú ảnh ban đầu sẽ được khóa. Studio có
                        thể mở lại khi bạn cần.
                      </p>
                      <div className="album-actions">
                        <button disabled={busy} onClick={() => setConfirm(false)}>
                          Chọn tiếp
                        </button>
                        <button
                          disabled={busy || pendingDrafts}
                          onClick={() => void command('finalize')}
                        >
                          Xác nhận gửi lựa chọn
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {selected && (
                  <div
                    className="album-viewer"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="album-photo-title"
                  >
                    <button
                      className="album-viewer__close"
                      aria-label="Đóng ảnh"
                      onClick={() => setSelectedId('')}
                    >
                      <X />
                    </button>
                    <div className="album-viewer__image">
                      <AlbumImage
                        key={selected.id}
                        client={client}
                        photo={selected}
                        onUrl={setModalUrl}
                      />
                    </div>
                    <aside>
                      <h2 id="album-photo-title">{selected.name}</h2>
                      <div className="album-actions">
                        <button
                          aria-label="Ảnh trước"
                          disabled={allPhotos.indexOf(selected) === 0}
                          onClick={() => {
                            setImageUrl('');
                            setSelectedId(allPhotos[allPhotos.indexOf(selected) - 1].id);
                          }}
                        >
                          <ChevronLeft />
                        </button>
                        <button
                          aria-label="Ảnh tiếp"
                          disabled={allPhotos.indexOf(selected) === allPhotos.length - 1}
                          onClick={() => {
                            setImageUrl('');
                            setSelectedId(allPhotos[allPhotos.indexOf(selected) + 1].id);
                          }}
                        >
                          <ChevronRight />
                        </button>
                        {imageUrl && (
                          <a className="album-button" href={imageUrl} download={selected.name}>
                            <Download size={16} /> Tải ảnh
                          </a>
                        )}
                      </div>
                      {tab === 0 && (
                        <button
                          disabled={!canSelect || busy || !selected.available}
                          onClick={() =>
                            void command('photo', {
                              photoId: selected.id,
                              selected: !selected.selected,
                            })
                          }
                        >
                          <Heart size={16} />{' '}
                          {selected.selected ? 'Đã chọn · Bỏ chọn' : 'Chọn ảnh này'}
                        </button>
                      )}
                      <label>
                        Ghi chú cho studio
                        <textarea
                          aria-label="Ghi chú cho studio"
                          rows={5}
                          maxLength={2000}
                          value={drafts[selected.id] ?? selected.note}
                          readOnly={!canNote || !selected.available}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [selected.id]: e.target.value }))
                          }
                        />
                      </label>
                      {canNote && selected.available && (
                        <button
                          disabled={
                            busy || (drafts[selected.id] ?? selected.note) === selected.note
                          }
                          onClick={() =>
                            void command('photo', {
                              photoId: selected.id,
                              note: drafts[selected.id],
                            })
                          }
                        >
                          {busy ? 'Đang lưu…' : 'Lưu ghi chú'}
                        </button>
                      )}
                      {drafts[selected.id] !== undefined &&
                        drafts[selected.id] !== selected.note && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              setDrafts((d) => {
                                const next = { ...d };
                                delete next[selected.id];
                                return next;
                              })
                            }
                          >
                            Bỏ thay đổi ghi chú
                          </button>
                        )}
                      {error && (
                        <p role="alert" className="album-error">
                          {error}
                        </p>
                      )}
                      {notice && <p role="status">{notice}</p>}
                      <button disabled={busy} onClick={() => void refresh()}>
                        Tải lại album · giữ ghi chú đang viết
                      </button>
                      {staff && (
                        <p className="album-hint">
                          Góp ý của khách được gắn đúng ảnh và phiên bản.
                        </p>
                      )}
                    </aside>
                  </div>
                )}
              </>
            )}
        </>
      )}
    </Container>
  );
}
