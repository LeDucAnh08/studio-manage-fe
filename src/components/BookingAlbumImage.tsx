import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { albumClient, AlbumPhoto, AlbumReplacement } from '@/services/bookingAlbumService';

type Client = ReturnType<typeof albumClient>;
const thumbnailCacheLimit = 128;

export function AlbumImage({
  client,
  photo,
  thumbnail = false,
  thumbnailCache,
  onUrl,
}: {
  client: Client;
  photo: AlbumPhoto | AlbumReplacement;
  thumbnail?: boolean;
  thumbnailCache?: Map<string, Blob>;
  onUrl?: (url: string) => void;
}) {
  const cache = thumbnail ? thumbnailCache : undefined;
  const photoId = photo.source === 'local' ? `local-${photo.id}` : photo.id;
  const version = photo.source === 'drive' ? photo.sourceVersion : undefined;
  const key = `${photoId}:${version || ''}:${thumbnail}`;
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => !thumbnail || !!cache?.has(key));
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: '', url: '', error: '' });
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
    const controller = new AbortController();
    let alive = true,
      url = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    setResult({ key, url: '', error: '' });
    onUrl?.('');
    const load = async (retry = 0) => {
      try {
        const blob = cache?.get(key) ?? (await client.image(photoId, thumbnail, controller.signal));
        if (!alive) return;
        if (cache) {
          cache.delete(key);
          cache.set(key, blob);
          if (cache.size > thumbnailCacheLimit) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
        }
        url = URL.createObjectURL(blob);
        setResult({ key, url, error: '' });
        onUrl?.(url);
      } catch (error) {
        if (!alive) return;
        const response = (error as { response?: { status: number; data: Blob } }).response;
        if ((response?.status === 429 || response?.status === 503) && retry < 4) {
          const delay = 1200 * 2 ** retry + Math.random() * 500;
          timer = setTimeout(() => void load(retry + 1), delay);
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
  }, [client, photoId, photo.available, thumbnail, visible, key, attempt, onUrl, cache]);
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
