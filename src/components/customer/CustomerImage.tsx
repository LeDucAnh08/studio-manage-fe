import { useCallback, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import '../../styles/customer-image.css';

interface CustomerImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function CustomerImage({
  src,
  srcSet,
  sizes,
  alt,
  width,
  height,
  priority = false,
  className,
}: CustomerImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const status = failedSrc === src ? 'error' : loadedSrc === src ? 'loaded' : 'loading';
  const checkCachedImage = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image?.complete) return;
      if (image.naturalWidth > 0) {
        setLoadedSrc(src);
        setFailedSrc(null);
      } else setFailedSrc(src);
    },
    [src],
  );

  return (
    <div
      className={cn('customer-image', className)}
      data-status={status}
      style={{ '--customer-image-ratio': `${width} / ${height}` } as CSSProperties}
    >
      <img
        key={src}
        ref={checkCachedImage}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        {...{ fetchpriority: priority ? 'high' : 'auto' }}
        decoding="async"
        onLoad={() => {
          setLoadedSrc(src);
          setFailedSrc(null);
        }}
        onError={() => setFailedSrc(src)}
      />
      {status !== 'loaded' && (
        <span className="customer-image__placeholder" aria-hidden="true">
          {status === 'error' ? 'Không tải được ảnh' : null}
        </span>
      )}
    </div>
  );
}
