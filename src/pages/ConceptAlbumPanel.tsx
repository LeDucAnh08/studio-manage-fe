import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useParams } from 'react-router-dom';
import {
  ConceptAlbum,
  ConceptOrder,
  ConceptPhoto,
  conceptError,
  conceptService,
  conceptStatus,
  money,
  vnTime,
} from '../services/conceptService';
import '../styles/concept.css';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import {
  OrderButton as Button,
  OrderInput as Input,
  OrderTextarea as Textarea,
} from '../components/customer/CustomerOrderControls';

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function Image({
  id,
  photo,
  guest,
  token,
  large = false,
}: {
  id: string;
  photo: ConceptPhoto;
  guest: boolean;
  token: string;
  large?: boolean;
}) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = '';
    setUrl('');
    setError('');
    conceptService
      .image(id, photo.id, { thumb: !large, guest, token, signal: abort.signal })
      .then((blob) => {
        if (!abort.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError('Không tải được ảnh. Kiểm tra nguồn Drive hoặc thử lại.');
      });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, photo.id, guest, token, large]);
  return error ? (
    <span role="status">{error}</span>
  ) : url ? (
    <img src={url} alt={photo.name} />
  ) : (
    <span role="status">Đang tải ảnh…</span>
  );
}
function Gallery({
  id,
  album,
  guest = false,
  token = '',
  select,
  saveNote,
  busy,
  onError,
}: {
  id: string;
  album: ConceptAlbum;
  guest?: boolean;
  token?: string;
  select?: (photo: ConceptPhoto) => void;
  saveNote?: (photo: ConceptPhoto, note: string) => void;
  busy: boolean;
  onError: (error: string) => void;
}) {
  const [version, setVersion] = useState(0),
    [limit, setLimit] = useState(16),
    [view, setView] = useState<string | null>(null),
    [zoom, setZoom] = useState(false),
    [notes, setNotes] = useState<Record<string, string>>({});
  const photos = album.photos.filter((p) => p.version === version);
  const current = photos.find((p) => p.id === view);
  const index = photos.findIndex((p) => p.id === view);
  const download = async (photo: ConceptPhoto) => {
    try {
      saveBlob(await conceptService.image(id, photo.id, { download: true }), photo.name);
    } catch (e) {
      onError(conceptError(e));
    }
  };
  return (
    <div>
      <div className="concept-tabs">
        <Button
          aria-pressed={version === 0}
          onClick={() => {
            setVersion(0);
            setLimit(16);
          }}
        >
          Ảnh chỉnh màu
        </Button>
        {album.deliveries.map((d) => (
          <Button
            key={d.version}
            aria-pressed={version === d.version}
            onClick={() => {
              setVersion(d.version);
              setLimit(16);
            }}
          >
            Retouch v{d.version}
          </Button>
        ))}
      </div>
      {version > 0 && album.allowDownload && !guest && (
        <Button
          disabled={busy}
          onClick={async () => {
            try {
              saveBlob(await conceptService.zip(id, version), `album-v${version}.zip`);
            } catch (e) {
              onError(conceptError(e));
            }
          }}
        >
          Tải toàn bộ bản v{version} (ZIP)
        </Button>
      )}
      <div className="concept-photo-grid">
        {photos.slice(0, limit).map((photo) => (
          <article className="concept-photo" key={photo.id}>
            <Button
              aria-label={`Xem ảnh ${photo.name}`}
              onClick={() => {
                setView(photo.id);
                setZoom(false);
              }}
              disabled={!photo.available}
            >
              <Image id={id} photo={photo} guest={guest} token={token} />
            </Button>
            <p>
              {photo.name}
              {!photo.available ? ' · Nguồn không còn khả dụng' : ''}
            </p>
            {select && version === 0 && (
              <>
                <Button
                  disabled={busy || (!photo.available && !photo.selected)}
                  aria-pressed={!!photo.selected}
                  onClick={() => select(photo)}
                >
                  {photo.selected ? '♥ Đã chọn' : '♡ Chọn retouch'}
                </Button>
                <label>
                  Ghi chú cho {photo.name}
                  <Textarea
                    maxLength={2000}
                    value={notes[photo.id] ?? photo.note ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [photo.id]: e.target.value }))}
                  />
                </label>
                <Button
                  disabled={busy || (notes[photo.id] ?? photo.note ?? '') === (photo.note || '')}
                  onClick={() => saveNote?.(photo, notes[photo.id] || '')}
                >
                  Lưu ghi chú
                </Button>
              </>
            )}
            {version > 0 && album.allowDownload && !guest && (
              <Button onClick={() => void download(photo)}>Tải ảnh</Button>
            )}
          </article>
        ))}
      </div>
      {photos.length > limit && <Button onClick={() => setLimit(limit + 16)}>Xem thêm ảnh</Button>}
      <Dialog.Root
        open={!!current}
        onOpenChange={(open) => {
          if (!open) setView(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="concept-dialog-overlay" />
          <Dialog.Content
            className="concept-dialog concept-workspace"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' && index < photos.length - 1)
                setView(photos[index + 1].id);
              if (e.key === 'ArrowLeft' && index > 0) setView(photos[index - 1].id);
            }}
          >
            <Dialog.Title>{current?.name}</Dialog.Title>
            <Dialog.Description>
              Ảnh {index + 1} trên {photos.length}. Dùng phím mũi tên để chuyển ảnh.
            </Dialog.Description>
            <Dialog.Close>Đóng ảnh</Dialog.Close>
            {current && (
              <figure data-zoom={zoom}>
                <Image id={id} photo={current} guest={guest} token={token} large />
              </figure>
            )}
            <div className="concept-actions">
              <Button disabled={index <= 0} onClick={() => setView(photos[index - 1].id)}>
                Ảnh trước
              </Button>
              <Button onClick={() => setZoom(!zoom)}>{zoom ? 'Thu nhỏ' : 'Phóng to'}</Button>
              <Button
                disabled={index >= photos.length - 1}
                onClick={() => setView(photos[index + 1].id)}
              >
                Ảnh sau
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
export default function ConceptAlbumPanel({
  order,
  onOrderChange,
}: {
  order: ConceptOrder;
  onOrderChange: () => void;
}) {
  const customer = useCustomerAppearance();
  const id = order._id;
  const [album, setAlbum] = useState<ConceptAlbum | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [folders, setFolders] = useState(''),
    [title, setTitle] = useState(order.snapshot.name),
    [share, setShare] = useState('');
  const [feedback, setFeedback] = useState<Record<string, string>>({}),
    [quotes, setQuotes] = useState<Record<string, { amount: string; terms: string }>>({}),
    [consent, setConsent] = useState(false);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async () => {
    const a = await conceptService.album(id);
    setAlbum(a);
  }, [id]);
  useEffect(() => {
    let active = true;
    conceptService
      .album(id)
      .then((a) => {
        if (active) {
          setAlbum(a);
          setError('');
        }
      })
      .catch((e) => {
        if (active && (e as { response?: { status?: number } }).response?.status !== 404)
          setError(conceptError(e));
      });
    return () => {
      active = false;
    };
  }, [id, order.version]);
  const command = async (operation: string, body: Record<string, unknown> = {}) => {
    setBusy(true);
    setError('');
    const payload = { ...body, expectedVersion: album?.version || 0 };
    const signature = JSON.stringify({ operation, ...payload });
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await conceptService.albumCommand(id, operation, payload, retry.current.key);
      setAlbum(result);
      retry.current = null;
      onOrderChange();
      if (result.token && result.share?.publicId)
        setShare(
          `${window.location.origin}/concept-albums/${result.share.publicId}#access=${result.token}`,
        );
      if (operation === 'feedback' || operation === 'request-extra') setFeedback({});
      return true;
    } catch (e) {
      setError(conceptError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const selected = album?.photos.filter((p) => p.version === 0 && p.selected) || [];
  const extra =
    Math.max(0, selected.length - order.snapshot.retouchQuota) * order.snapshot.extraPhotoPrice;
  const feedbackItems = Object.entries(feedback)
    .filter(([, note]) => note.trim())
    .map(([photoId, note]) => ({ photoId, note }));
  return (
    <section className={customer ? 'customer-order-surface concept-order-album' : undefined}>
      <h2 className={customer ? 'customer-section-title' : undefined}>Album và hậu kỳ</h2>
      {error && (
        <p role="alert" className="concept-error">
          {error}{' '}
          <Button onClick={() => load().catch((e) => setError(conceptError(e)))}>
            Tải lại album
          </Button>
        </p>
      )}
      {order.canEdit && (
        <details className="concept-card" open={!album}>
          <summary>Nguồn ảnh Google Drive</summary>
          <p>
            Ảnh JPEG/PNG/WebP trong thư mục chia sẻ bằng link. Mỗi bộ tối đa 500 ảnh. Bản retouch
            giữ tên file ảnh đã chốt và dùng thư mục riêng cho mỗi phiên bản.
          </p>
          <label>
            Tên album
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Link thư mục (mỗi dòng một link)
            <Textarea value={folders} onChange={(e) => setFolders(e.target.value)} />
          </label>
          <div className="concept-actions">
            <Button
              disabled={busy || !folders.trim()}
              onClick={() =>
                void command('sync', {
                  title,
                  folders: folders
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            >
              Lấy ảnh chỉnh màu
            </Button>
            {album && (
              <Button
                disabled={busy || !folders.trim()}
                onClick={() =>
                  void command('deliver', {
                    folders: folders
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              >
                Gửi bản retouch mới
              </Button>
            )}
          </div>
        </details>
      )}
      {!album && (
        <p>Album chưa được xuất bản. Khách cần thanh toán phần còn lại trước khi mở ảnh.</p>
      )}
      {album && (
        <>
          <header>
            <h3>{album.title}</h3>
            <p>
              {conceptStatus[album.status]} · Đã dùng {album.freeRoundsUsed}/2 vòng feedback miễn
              phí
            </p>
          </header>
          {order.canEdit && (
            <div className="concept-actions">
              {album.status === 'draft' && (
                <Button disabled={busy} onClick={() => void command('publish')}>
                  Mở album chọn ảnh
                </Button>
              )}
              {album.status === 'queued' && (
                <Button disabled={busy} onClick={() => void command('start')}>
                  Bắt đầu retouch
                </Button>
              )}
              {order.canManage && ['queued', 'awaiting_extra'].includes(album.status) && (
                <Button disabled={busy} onClick={() => void command('reopen')}>
                  Mở lại lựa chọn
                </Button>
              )}
              {order.canManage && (
                <>
                  <Button disabled={busy} onClick={() => void command('share')}>
                    Tạo link chỉ xem (7 ngày)
                  </Button>
                  <Button disabled={busy} onClick={() => void command('revoke')}>
                    Thu hồi link
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void command('download-policy', { allowed: !album.allowDownload })
                    }
                  >
                    {album.allowDownload ? 'Tắt tải ảnh' : 'Cho tải ảnh'}
                  </Button>
                </>
              )}
            </div>
          )}
          {share && (
            <p className="concept-notice">
              Link mới (lưu lại để chia sẻ): <a href={share}>{share}</a>
            </p>
          )}
          {album.status === 'selecting' && order.isOwner && (
            <div className="concept-card">
              <p>
                Đã chọn{' '}
                <strong>
                  {selected.length}/{order.snapshot.retouchQuota}
                </strong>{' '}
                ảnh · Phí thêm <strong>{money(extra)}</strong>
              </p>
              <label className="concept-check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Tôi chốt danh sách và đồng ý phí ảnh thêm {money(extra)}.
              </label>
              <Button
                disabled={busy || !selected.length || !consent}
                onClick={() => void command('finalize', { accepted: true })}
              >
                Chốt ảnh retouch
              </Button>
            </div>
          )}
          {album.status === 'awaiting_extra' && (
            <p className="concept-notice">
              Thanh toán khoản ảnh thêm trong mục thanh toán để chuyển sang retouch.
            </p>
          )}
          <Gallery
            id={id}
            album={album}
            busy={busy}
            onError={setError}
            select={
              album.status === 'selecting' && order.isOwner
                ? (p) => void command('photo', { photoId: p.id, selected: !p.selected })
                : undefined
            }
            saveNote={(p, note) => void command('photo', { photoId: p.id, note })}
          />
          {album.selections?.length > 0 && (
            <details>
              <summary>Danh sách ảnh đã chốt và ghi chú</summary>
              {album.selections.map((s) => (
                <div key={s.round}>
                  <h3>
                    Lần chốt {s.round} · Phí ảnh thêm {money(s.extra)}
                  </h3>
                  <pre>
                    {s.photos.map((p) => `${p.name}${p.note ? ' — ' + p.note : ''}`).join('\n')}
                  </pre>
                  <Button
                    onClick={() =>
                      saveBlob(
                        new Blob([s.photos.map((p) => p.name).join('\n')], {
                          type: 'text/plain;charset=utf-8',
                        }),
                        'anh-retouch.txt',
                      )
                    }
                  >
                    Xuất tên file TXT
                  </Button>
                </div>
              ))}
            </details>
          )}
          {order.isOwner && ['delivered', 'completed'].includes(album.status) && (
            <section className="concept-card">
              <h3>
                {album.freeRoundsUsed < 2 && album.status === 'delivered'
                  ? 'Góp ý cho bản mới nhất'
                  : 'Yêu cầu chỉnh thêm có phí'}
              </h3>
              <p>
                Mỗi lần gửi là một vòng tổng hợp cho toàn bộ ảnh. Ghi góp ý dưới những ảnh cần
                chỉnh.
              </p>
              {album.photos
                .filter((p) => p.version === album.deliveryVersion)
                .map((p) => (
                  <label key={p.id}>
                    {p.name}
                    <Textarea
                      maxLength={2000}
                      value={feedback[p.id] || ''}
                      onChange={(e) => setFeedback((f) => ({ ...f, [p.id]: e.target.value }))}
                    />
                  </label>
                ))}
              <Button
                disabled={busy || !feedbackItems.length}
                onClick={() =>
                  void command(
                    album.freeRoundsUsed < 2 && album.status === 'delivered'
                      ? 'feedback'
                      : 'request-extra',
                    { deliveryVersion: album.deliveryVersion, items: feedbackItems },
                  )
                }
              >
                {album.freeRoundsUsed < 2 && album.status === 'delivered'
                  ? 'Gửi vòng feedback'
                  : 'Yêu cầu báo phí'}
              </Button>
              {album.status === 'delivered' && (
                <Button
                  disabled={busy}
                  onClick={() => void command('accept', { deliveryVersion: album.deliveryVersion })}
                >
                  Xác nhận ảnh đã đạt yêu cầu
                </Button>
              )}
            </section>
          )}
          {!!album.feedbackRounds?.length && (
            <section>
              <h3>Lịch sử feedback</h3>
              {album.feedbackRounds.map((round) => (
                <article className="concept-card" key={round.id}>
                  <p>
                    Vòng {round.round} · bản v{round.version} · {vnTime(round.at)}
                  </p>
                  {round.items.map((item) => (
                    <div key={item.photoId}>
                      <p>
                        {album.photos.find((p) => p.id === item.photoId)?.name}: {item.note}
                      </p>
                      <p>{item.resolved ? 'Đã xử lý' : 'Chờ xử lý'}</p>
                      {order.canEdit && album.status === 'revising' && (
                        <Button
                          disabled={busy}
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
                      )}
                    </div>
                  ))}
                </article>
              ))}
            </section>
          )}
          {!!album.paidRequests?.length && (
            <section>
              <h3>Yêu cầu phát sinh</h3>
              {album.paidRequests.map((r) => (
                <article className="concept-card" key={r.id}>
                  <p>
                    Bản v{r.version} ·{' '}
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
                      )[r.status]
                    }
                  </p>
                  {r.items.map((i) => (
                    <p key={i.photoId}>
                      {album.photos.find((p) => p.id === i.photoId)?.name}: {i.note}
                      {order.canEdit && r.status === 'processing' && (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void command('resolve', {
                              roundId: r.id,
                              photoId: i.photoId,
                              resolved: !i.resolved,
                            })
                          }
                        >
                          {i.resolved ? 'Đã xử lý · đánh dấu chưa xong' : 'Đánh dấu đã xử lý'}
                        </Button>
                      )}
                    </p>
                  ))}
                  {r.amount && (
                    <p>
                      {money(r.amount)} · {r.terms}
                    </p>
                  )}
                  {order.canManage && ['requested', 'quoted'].includes(r.status) && (
                    <>
                      <label>
                        Phí chỉnh thêm
                        <Input
                          type="number"
                          min="1"
                          value={quotes[r.id]?.amount || ''}
                          onChange={(e) =>
                            setQuotes((q) => ({
                              ...q,
                              [r.id]: { amount: e.target.value, terms: q[r.id]?.terms || '' },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Phạm vi công việc
                        <Textarea
                          value={quotes[r.id]?.terms || ''}
                          onChange={(e) =>
                            setQuotes((q) => ({
                              ...q,
                              [r.id]: { amount: q[r.id]?.amount || '', terms: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <Button
                        disabled={busy || !quotes[r.id]?.amount || !quotes[r.id]?.terms}
                        onClick={() =>
                          void command('quote', {
                            requestId: r.id,
                            amount: Number(quotes[r.id].amount),
                            terms: quotes[r.id].terms,
                          })
                        }
                      >
                        Gửi báo giá
                      </Button>
                    </>
                  )}
                  {order.isOwner && r.status === 'quoted' && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void command('accept-quote', {
                          requestId: r.id,
                          accepted: true,
                          amount: r.amount,
                        })
                      }
                    >
                      Đồng ý báo giá và tạo QR
                    </Button>
                  )}
                  {order.isOwner && ['requested', 'quoted'].includes(r.status) && (
                    <Button
                      disabled={busy}
                      onClick={() => void command('decline-quote', { requestId: r.id })}
                    >
                      Hủy yêu cầu phát sinh
                    </Button>
                  )}
                  {order.canEdit && r.status === 'paid' && (
                    <Button
                      disabled={busy}
                      onClick={() => void command('start', { requestId: r.id })}
                    >
                      Bắt đầu chỉnh thêm
                    </Button>
                  )}
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
export function GuestConceptAlbumPage() {
  const { publicId = '' } = useParams();
  const token = new URLSearchParams(window.location.hash.slice(1)).get('access') || '';
  const [album, setAlbum] = useState<ConceptAlbum | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    conceptService
      .guestAlbum(publicId, token, abort.signal)
      .then(setAlbum)
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      });
    return () => abort.abort();
  }, [publicId, token]);
  return (
    <main className="concept-workspace" style={{ padding: '24px' }}>
      <p className="concept-eyebrow">Yume Studio</p>
      <h1>{album?.title || 'Album chia sẻ'}</h1>
      <p>Link chỉ xem · Lựa chọn và góp ý do chủ đơn thực hiện trong tài khoản.</p>
      {error && (
        <p role="alert" className="concept-error">
          {error}
        </p>
      )}
      {album ? (
        <Gallery id={publicId} album={album} guest token={token} busy={false} onError={setError} />
      ) : (
        !error && <p role="status">Đang mở album…</p>
      )}
    </main>
  );
}
