import { useBookingAlbum } from '../hooks/useBookingAlbum';
import { AlbumImage } from '../components/BookingAlbumImage';
import { CustomerDriveAlbum } from '@/components/customer/CustomerDriveAlbum';
import { CustomerTextarea } from '@/components/customer/CustomerFields';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Heart, X } from 'lucide-react';
import { albumClient, type BookingAlbum } from '@/services/bookingAlbumService';
import '../styles/booking-album.css';

const splitFolders = (text: string) =>
  text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

type AlbumPageProps = {
  staff?: boolean;
  account?: boolean;
  embedded?: boolean;
  section?: 'selection' | 'delivery';
  deliveryVersion?: number;
  onAlbumChange?: (album: BookingAlbum | null) => void;
  canCommentDelivery?: boolean;
  workflowVersion?: number;
  lifecycle?: string;
};

export default function BookingAlbumPage(props: AlbumPageProps) {
  const { staff = false, account = false, embedded = false } = props;
  const { id = '', publicId = '' } = useParams();
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('access') || '';
  const client = useMemo(
    () =>
      account ? albumClient(false, id, '', true) : albumClient(staff, staff ? id : publicId, token),
    [staff, account, id, publicId, token],
  );
  if (staff) return <StaffBookingAlbum {...props} client={client} id={id} />;
  return (
    <CustomerDriveAlbum
      key={`${account ? id : publicId}:${token}`}
      client={client}
      account={account}
      embedded={embedded}
      section={props.section}
      deliveryVersion={props.deliveryVersion}
      canCommentDelivery={props.canCommentDelivery}
      onAlbumChange={props.onAlbumChange}
    />
  );
}

function StaffBookingAlbum({
  client,
  id,
  embedded = false,
  section,
  deliveryVersion = 0,
  workflowVersion,
  lifecycle,
  onAlbumChange,
}: AlbumPageProps & { client: ReturnType<typeof albumClient>; id: string }) {
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
  const [revisionNote, setRevisionNote] = useState('');
  const {
    album,
    loaded,
    error,
    notice,
    shareUrl,
    busy,
    background,
    refresh,
    command,
    workflowAction: saveWorkflow,
    extension,
    setExtension,
    exportText,
    exportNames,
    copy,
    downloadText,
  } = useBookingAlbum(client, id, {
    onLoad(next) {
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
    },
    onChange: onAlbumChange,
  });
  useEffect(() => {
    setSelectedId('');
  }, [client]);
  useEffect(() => {
    if (embedded && loaded) setTab(section === 'selection' ? 0 : deliveryVersion || -1);
  }, [embedded, section, deliveryVersion, loaded]);
  const workflowAction = async (
    action: 'progress.update' | 'delivery.revision.start',
    data: Record<string, unknown>,
  ) => {
    if (album?.workflowVersion === undefined) return;
    await saveWorkflow(workflowVersion ?? 0, action, data);
  };
  const allPhotos = album?.photos.filter((p) => p.deliveryVersion === tab) || [];
  const filtered = allPhotos.filter(
    (p) =>
      (!folder || p.folderId === folder) &&
      (filter === 'selected' ? p.selected : filter === 'notes' ? !!p.note : true),
  );
  const selected = allPhotos.find((p) => p.id === selectedId);
  const chosen =
    album?.photos.filter((p) => p.deliveryVersion === 0 && p.available && p.selected).length || 0;
  useEffect(() => {
    setShown(60);
    setFolder('');
    setFilter('all');
    setSelectedId('');
  }, [tab]);
  const setModalUrl = useCallback((url: string) => setImageUrl(url), []);
  const dialogOpen = !!selectedId;
  useEffect(() => {
    if (!dialogOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('.album-viewer');
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
  const Container = embedded ? 'section' : 'main';
  return (
    <Container className={`album-page${embedded ? ' album-page--embedded' : ''}`}>
      {!embedded && (
        <header className="album-header">
          <div>
            <span className="album-eyebrow">Không gian làm việc của studio</span>
            <h1>{album?.title || 'Album ảnh'}</h1>
            <p>Chọn khoảnh khắc bạn muốn giữ lại.</p>
          </div>
          <Link
            className="app-back-link album-button album-button--quiet"
            to={`/workflow-bookings/${id}`}
          >
            <ArrowLeft size={16} /> Hồ sơ đơn
          </Link>
        </header>
      )}
      <div className="album-messages" aria-live="polite">
        {error && (
          <p role="alert" className="album-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {background.message && (
          <p role={background.failed ? 'alert' : 'status'}>{background.message}</p>
        )}
      </div>
      {!loaded ? (
        <p role="status">Đang mở album…</p>
      ) : (
        <>
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
                          <button onClick={() => void copy(exportText)}>Sao chép danh sách</button>
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
          {album &&
            (!embedded ||
              section === 'selection' ||
              tab === -1 ||
              album.deliveryVersions.includes(tab)) && (
              <>
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
                    {album.photos.some((p) => p.deliveryVersion === -1) && (
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
                            disabled
                          >
                            <Heart size={18} fill={photo.selected ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                      {photo.note && <p className="album-card__note">{photo.note}</p>}
                      {tab === 0 && photo.available && (
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
                        <button disabled>
                          <Heart size={16} />{' '}
                          {selected.selected ? 'Đã chọn · Bỏ chọn' : 'Chọn ảnh này'}
                        </button>
                      )}
                      <label>
                        Ghi chú cho studio
                        <CustomerTextarea
                          aria-label="Ghi chú cho studio"
                          rows={5}
                          maxLength={2000}
                          value={selected.note}
                          readOnly
                        />
                      </label>
                      {error && (
                        <p role="alert" className="album-error">
                          {error}
                        </p>
                      )}
                      {notice && <p role="status">{notice}</p>}
                      {background.message && (
                        <p role={background.failed ? 'alert' : 'status'}>{background.message}</p>
                      )}
                      <button disabled={busy} onClick={() => void refresh()}>
                        Tải lại album · giữ ghi chú đang viết
                      </button>
                      <p className="album-hint">Góp ý của khách được gắn đúng ảnh và phiên bản.</p>
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
