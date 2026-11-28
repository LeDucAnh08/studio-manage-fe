import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { OrderButton } from './customer/CustomerOrderControls';
import { Input } from '@/components/ui';
import { conceptError, conceptService, type ConceptPhoto } from '@/services/conceptService';
import '../styles/booking-delivery.css';

export function ConceptPhotoImage({
  orderId,
  photo,
  guest = false,
  token = '',
  thumbnail = false,
  thumbnailCache,
  onUrl,
}: {
  orderId: string;
  photo: ConceptPhoto;
  guest?: boolean;
  token?: string;
  thumbnail?: boolean;
  thumbnailCache?: Map<string, Blob>;
  onUrl?: (url: string) => void;
}) {
  const cache = thumbnail ? thumbnailCache : undefined;
  const key = `${orderId}:${photo.id}:${photo.sourceVersion || ''}:${photo.source || 'drive'}:${guest}:${thumbnail}`;
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => !thumbnail || !!cache?.has(key));
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: '', url: '', error: '' });
  const onUrlRef = useRef(onUrl);
  useLayoutEffect(() => {
    onUrlRef.current = onUrl;
  }, [onUrl]);

  useEffect(() => {
    if (visible) return;
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
  }, [thumbnail, visible]);

  useLayoutEffect(() => {
    if (!visible || !photo.available) return;
    const abort = new AbortController();
    let alive = true;
    let objectUrl = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    setResult({ key, url: '', error: '' });
    onUrlRef.current?.('');

    const load = async (retry = 0) => {
      try {
        const cached = cache?.get(key);
        const blob =
          cached ??
          (photo.source === 'local' && !guest
            ? await conceptService.deliveryImage(orderId, photo.id, {
                thumb: thumbnail,
                signal: abort.signal,
              })
            : await conceptService.image(orderId, photo.id, {
                thumb: thumbnail,
                guest,
                token,
                signal: abort.signal,
              }));
        if (!alive) return;
        if (cache && !cached) {
          cache.delete(key);
          cache.set(key, blob);
          if (cache.size > 128) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
        }
        objectUrl = URL.createObjectURL(blob);
        setResult({ key, url: objectUrl, error: '' });
        onUrlRef.current?.(objectUrl);
      } catch (err) {
        if (!alive) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if ((status === 429 || status === 503) && retry < 4) {
          const delay = 1200 * 2 ** retry + Math.random() * 500;
          timer = setTimeout(() => void load(retry + 1), delay);
          return;
        }
        setResult({ key, url: '', error: 'Không tải được ảnh. Thử lại.' });
      }
    };

    void load();
    return () => {
      alive = false;
      abort.abort();
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, photo.id, photo.source, photo.available, guest, token, thumbnail, visible, key, attempt, cache]);

  return (
    <div ref={element} className={`album-image ${thumbnail ? 'album-image--thumb' : ''}`}>
      {!photo.available ? (
        <span>Ảnh không còn trong thư mục</span>
      ) : result.key === key && result.url ? (
        <img src={result.url} alt={photo.name} />
      ) : result.key === key && result.error ? (
        <div role="status">
          <p title={thumbnail ? result.error : undefined}>{result.error}</p>
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

export function ConceptLocalUpload({
  orderId,
  previous = [],
  onChange,
  onBusy,
}: {
  orderId: string;
  previous?: ConceptPhoto[];
  onChange: (ids: string[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const inputId = useId();
  const [photos, setPhotos] = useState<ConceptPhoto[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Array<{ file: File; key: string }>>([]);
  const [restoring, setRestoring] = useState(true);
  const refs = useRef({ onChange, onBusy });
  useLayoutEffect(() => {
    refs.current = { onChange, onBusy };
  }, [onChange, onBusy]);
  const values = useRef<ConceptPhoto[]>([]);
  const alive = useRef(true);
  const controller = useRef<AbortController>();
  const [base] = useState(() =>
    previous.filter((photo) => photo.source === 'local' && !photo.originalPhotoId),
  );

  const apply = (next: ConceptPhoto[]) => {
    values.current = next;
    setPhotos(next);
    refs.current.onChange(next.map((photo) => photo.id));
  };

  useEffect(() => {
    let active = true;
    alive.current = true;
    setRestoring(true);
    refs.current.onBusy(true);
    const request = new AbortController();
    void conceptService
      .deliveryDrafts(orderId, request.signal)
      .then((drafts) => {
        if (!active) return;
        const merged = [
          ...base,
          ...drafts.filter((photo) => !base.some((old) => old.id === photo.id)),
        ];
        values.current = merged;
        setPhotos(merged);
        setDraftIds(drafts.map((photo) => photo.id));
        refs.current.onChange(merged.map((photo) => photo.id));
      })
      .catch(() => {
        if (active) setError('Chưa tải được ảnh nháp. Hãy tải lại hồ sơ trước khi tiếp tục.');
      })
      .finally(() => {
        if (active) {
          setRestoring(false);
          refs.current.onBusy(false);
        }
      });
    return () => {
      active = false;
      alive.current = false;
      request.abort();
      controller.current?.abort();
      refs.current.onBusy(false);
    };
  }, [orderId, base]);

  const upload = async (items: Array<{ file: File; key: string }>) => {
    setBusy(true);
    refs.current.onBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      for (let index = 0; index < items.length; index++) {
        try {
          const photo = await conceptService.uploadDeliveryPhoto(
            orderId,
            items[index].file,
            items[index].key,
            controller.current.signal,
          );
          if (!alive.current) return;
          if (!values.current.some((old) => old.id === photo.id)) apply([...values.current, photo]);
          setDraftIds((ids) => [...new Set([...ids, photo.id])]);
          setPending(items.slice(index + 1));
        } catch (err) {
          if (alive.current) {
            setPending(items.slice(index));
            setError(conceptError(err));
          }
          return;
        }
      }
    } finally {
      if (alive.current) {
        setBusy(false);
        refs.current.onBusy(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="text-sm font-semibold">
        Ảnh đã hậu kỳ
      </label>
      <p className="text-sm text-muted-foreground">
        Tải JPEG, PNG hoặc WebP, tối đa 20 MB/ảnh và 500 ảnh/bản bàn giao. Ảnh chỉ hiển thị cho
        khách sau khi bấm gửi bản bàn giao. Bỏ ảnh không muốn giữ từ bản trước.
      </p>
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={busy || restoring || pending.length > 0}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          if (!files.length) return;
          if (
            files.some((file) => !file.size || file.size > 20 * 1024 * 1024) ||
            values.current.length + files.length > 500
          ) {
            setError('Chỉ chọn ảnh tối đa 20 MB, không vượt quá 500 ảnh/bản.');
            return;
          }
          const items = files.map((file) => ({ file, key: crypto.randomUUID() }));
          setPending(items);
          void upload(items);
        }}
      />
      <p role="status" className="text-sm">
        {busy ? 'Đang tải ảnh… ' : ''}
        {photos.length} ảnh đã tải{pending.length > 0 ? ` · ${pending.length} ảnh đang chờ` : ''}
      </p>
      {base.length > 0 && (
        <OrderButton
          variant="outline"
          disabled={busy || restoring}
          onClick={() => apply(values.current.filter((photo) => draftIds.includes(photo.id)))}
        >
          Bỏ ảnh bản trước khỏi bản mới
        </OrderButton>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!busy && pending.length > 0 && (
        <div className="flex gap-2">
          <OrderButton variant="outline" onClick={() => void upload(pending)}>
            Thử tải tiếp
          </OrderButton>
          <OrderButton variant="ghost" onClick={() => setPending([])}>
            Bỏ các ảnh đang chờ
          </OrderButton>
        </div>
      )}
      <div className="delivery-upload-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="space-y-1">
            <div className="delivery-thumbnail">
              <div className="delivery-thumbnail__button">
                <ConceptPhotoImage orderId={orderId} photo={photo} thumbnail />
              </div>
              <p title={photo.name}>{photo.name}</p>
            </div>
            {!draftIds.includes(photo.id) && (
              <p className="text-xs text-muted-foreground">Ảnh từ bản trước</p>
            )}
            <OrderButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                refs.current.onBusy(true);
                setError('');
                try {
                  if (draftIds.includes(photo.id))
                    await conceptService.deleteDeliveryPhoto(orderId, photo.id);
                  if (!alive.current) return;
                  apply(values.current.filter((item) => item.id !== photo.id));
                } catch (err) {
                  setError(conceptError(err));
                } finally {
                  if (alive.current) {
                    setBusy(false);
                    refs.current.onBusy(false);
                  }
                }
              }}
            >
              Bỏ ảnh
            </OrderButton>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConceptReplacementUpload({
  orderId,
  original,
  busy,
  onBusy,
  onSaved,
}: {
  orderId: string;
  original: ConceptPhoto;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const inputId = useId();
  const [upload, setUpload] = useState<{ file: File; key: string }>();
  const [error, setError] = useState('');
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!upload || busy || request.current) return;
    const ctrl = new AbortController();
    request.current = ctrl;
    setError('');
    onBusy(true);
    try {
      await conceptService.uploadDeliveryPhoto(
        orderId,
        upload.file,
        upload.key,
        ctrl.signal,
        original.id,
      );
      if (!ctrl.signal.aborted) await onSaved();
    } catch (err) {
      if (!ctrl.signal.aborted) setError(conceptError(err));
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
          setUpload(file ? { file, key: crypto.randomUUID() } : undefined);
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
      <OrderButton type="submit" disabled={busy || !upload}>
        {busy ? 'Đang tải bản chỉnh…' : 'Lưu bản chỉnh'}
      </OrderButton>
    </form>
  );
}

export function ConceptLocalGallery({
  orderId,
  photos,
  allowDownload = false,
  onDownload,
}: {
  orderId: string;
  photos: ConceptPhoto[];
  allowDownload?: boolean;
  onDownload?: (photo: ConceptPhoto) => void;
}) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(0);
  const currentIndex = Math.min(selected, Math.max(0, photos.length - 1));
  const current = photos[currentIndex];
  const viewer = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === viewer.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    const track = strip.current;
    const item = track?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (track && item && track.scrollTo) {
      track.scrollTo({
        left: item.offsetLeft - (track.clientWidth - item.clientWidth) / 2,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }
  }, [currentIndex]);

  const expand = async () => {
    setFullscreenError('');
    try {
      if (document.fullscreenElement === viewer.current) await document.exitFullscreen();
      else if (viewer.current?.requestFullscreen) await viewer.current.requestFullscreen();
      else setFullscreenError('Trình duyệt chưa hỗ trợ xem toàn màn hình.');
    } catch {
      setFullscreenError('Chưa thể mở toàn màn hình. Vui lòng thử lại.');
    }
  };

  if (!current || !user) return <p>Studio chưa bàn giao ảnh trong hệ thống.</p>;

  return (
    <section
      ref={viewer}
      className="delivery-gallery"
      aria-label="Ảnh đã bàn giao"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && currentIndex > 0) setSelected(currentIndex - 1);
        if (event.key === 'ArrowRight' && currentIndex < photos.length - 1)
          setSelected(currentIndex + 1);
      }}
    >
      <div className="delivery-viewer">
        <div className="delivery-viewer__toolbar">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <strong>{current.name}</strong>
            <span>
              Ảnh {currentIndex + 1}/{photos.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowDownload && onDownload && (
              <OrderButton variant="outline" size="sm" onClick={() => onDownload(current)}>
                <Download size={16} aria-hidden="true" /> Tải ảnh
              </OrderButton>
            )}
            <OrderButton
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setSelected(currentIndex - 1)}
            >
              <ChevronLeft size={16} aria-hidden="true" /> Ảnh trước
            </OrderButton>
            <OrderButton
              variant="outline"
              size="sm"
              disabled={currentIndex >= photos.length - 1}
              onClick={() => setSelected(currentIndex + 1)}
            >
              Ảnh tiếp <ChevronRight size={16} aria-hidden="true" />
            </OrderButton>
            <OrderButton variant="outline" size="sm" onClick={() => void expand()}>
              {fullscreen ? (
                <>
                  <Minimize size={16} aria-hidden="true" /> Thu nhỏ
                </>
              ) : (
                <>
                  <Maximize size={16} aria-hidden="true" /> Toàn màn hình
                </>
              )}
            </OrderButton>
          </div>
        </div>
        {fullscreenError && (
          <p role="status" className="text-sm">
            {fullscreenError}
          </p>
        )}
        <div className="delivery-viewer__frame">
          <ConceptPhotoImage key={current.id} orderId={orderId} photo={current} />
        </div>
      </div>
      <div ref={strip} className="delivery-strip" role="list" aria-label="Danh sách thu nhỏ">
        {photos.map((photo, index) => (
          <div key={photo.id} role="listitem">
            <div className="delivery-thumbnail">
              <button
                type="button"
                className="delivery-thumbnail__button"
                aria-pressed={index === currentIndex}
                aria-label={`Xem ảnh ${photo.name}`}
                onClick={() => setSelected(index)}
              >
                <ConceptPhotoImage orderId={orderId} photo={photo} thumbnail />
              </button>
              <p title={photo.name}>{photo.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
