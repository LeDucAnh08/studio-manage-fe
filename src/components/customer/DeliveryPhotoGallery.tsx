import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ImageIcon, Maximize, Minimize } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { bookingDeliveryService, type DeliveryPhoto } from '@/services/bookingDeliveryService';
import { OrderButton } from './CustomerOrderControls';

function usePrivatePhoto(
  bookingId: string,
  photoId: string | undefined,
  thumbnail: boolean,
  enabled = true,
) {
  const { user, token } = useAuth();
  const userId = user?._id;
  const key = `${userId}:${token}:${bookingId}:${photoId}:${thumbnail}`;
  const identity = useRef(key);
  useLayoutEffect(() => {
    identity.current = key;
  }, [key]);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ key: '', url: '', error: false });
  useEffect(() => {
    if (!photoId || !enabled || !userId) return;
    const controller = new AbortController();
    let active = true,
      url = '';
    setState({ key, url: '', error: false });
    void bookingDeliveryService
      .image(bookingId, photoId, thumbnail, controller.signal)
      .then((blob) => {
        if (!active || identity.current !== key) return;
        url = URL.createObjectURL(blob);
        setState({ key, url, error: false });
      })
      .catch(() => {
        if (active && identity.current === key) setState({ key, url: '', error: true });
      });
    return () => {
      active = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, bookingId, photoId, thumbnail, enabled, retry, userId]);
  return {
    ...(state.key === key && enabled ? state : { url: '', error: false }),
    retry: () => setRetry((value) => value + 1),
  };
}

export function DeliveryThumbnail({
  bookingId,
  photo,
  selected,
  onSelect,
}: {
  bookingId: string;
  photo: DeliveryPhoto;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: '200px' },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const image = usePrivatePhoto(bookingId, photo.id, true, visible);
  return (
    <div ref={ref} className="delivery-thumbnail">
      <button
        type="button"
        className="delivery-thumbnail__button"
        aria-pressed={selected}
        aria-label={`Xem ảnh ${photo.name}`}
        onClick={onSelect}
        disabled={!onSelect}
      >
        {image.url ? (
          <img
            src={image.url}
            alt={photo.name}
            width={photo.width}
            height={photo.height}
            loading="lazy"
          />
        ) : (
          <span>{image.error ? 'Chưa tải được ảnh' : 'Ảnh hậu kỳ'}</span>
        )}
      </button>
      <p title={photo.name}>{photo.name}</p>
      {image.error && (
        <OrderButton size="sm" variant="ghost" onClick={image.retry}>
          Tải lại ảnh
        </OrderButton>
      )}
    </div>
  );
}

export function DeliveryPhotoGallery({
  bookingId,
  photos,
}: {
  bookingId: string;
  photos: DeliveryPhoto[];
}) {
  const [selected, setSelected] = useState(0);
  const currentIndex = Math.min(selected, photos.length - 1);
  const current = photos[currentIndex];
  const image = usePrivatePhoto(bookingId, current?.id, false);
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
    const selected = track?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (track && selected && track.scrollTo)
      track.scrollTo({
        left: selected.offsetLeft - (track.clientWidth - selected.clientWidth) / 2,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
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
  if (!current) return <p>Studio chưa bàn giao ảnh trong hệ thống.</p>;
  return (
    <div className="delivery-gallery">
      <figure
        ref={viewer}
        className="delivery-gallery__viewer"
        aria-label="Ảnh đang xem"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setSelected(Math.max(0, currentIndex - 1));
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            setSelected(Math.min(photos.length - 1, currentIndex + 1));
          }
        }}
      >
        {image.url ? (
          <img src={image.url} alt={current.name} width={current.width} height={current.height} />
        ) : (
          <div className="delivery-gallery__loading">
            <p role="status">{image.error ? 'Chưa thể tải ảnh này.' : 'Đang tải ảnh…'}</p>
            {image.error && (
              <OrderButton variant="outline" onClick={image.retry}>
                Thử tải lại
              </OrderButton>
            )}
          </div>
        )}
        <button
          type="button"
          className="delivery-gallery__expand"
          aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Xem toàn màn hình'}
          disabled={!image.url}
          onClick={() => void expand()}
        >
          {fullscreen ? (
            <Minimize size={20} aria-hidden="true" />
          ) : (
            <Maximize size={20} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="delivery-gallery__arrow delivery-gallery__arrow--previous"
          aria-label="Ảnh trước"
          disabled={currentIndex <= 0}
          onClick={() => setSelected(currentIndex - 1)}
        >
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="delivery-gallery__arrow delivery-gallery__arrow--next"
          aria-label="Ảnh tiếp"
          disabled={currentIndex >= photos.length - 1}
          onClick={() => setSelected(currentIndex + 1)}
        >
          <ChevronRight size={28} aria-hidden="true" />
        </button>
        <figcaption className="delivery-gallery__counter" aria-live="polite">
          {currentIndex + 1} / {photos.length}
        </figcaption>
      </figure>
      {fullscreenError && (
        <p role="status" className="text-sm">
          {fullscreenError}
        </p>
      )}
      <div ref={strip} className="delivery-gallery__grid" aria-label="Ảnh đã hậu kỳ">
        {photos.map((photo, index) => (
          <DeliveryThumbnail
            key={photo.id}
            bookingId={bookingId}
            photo={photo}
            selected={index === currentIndex}
            onSelect={() => setSelected(index)}
          />
        ))}
      </div>
      <div className="delivery-gallery__details">
        <p className="delivery-gallery__filename">
          <ImageIcon size={18} aria-hidden="true" />
          <span>{current.name}</span>
          <span className="delivery-gallery__dimensions">
            {current.width} × {current.height}
          </span>
        </p>
        {image.url && (
          <OrderButton asChild variant="outline">
            <a
              href={image.url}
              download={
                current.source === 'drive'
                  ? current.name
                  : `${current.name.replace(/\.[^.]+$/, '')}.jpg`
              }
            >
              <Download size={17} aria-hidden="true" />
              Tải ảnh đang xem
            </a>
          </OrderButton>
        )}
      </div>
    </div>
  );
}
