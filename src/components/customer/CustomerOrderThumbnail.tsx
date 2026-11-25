import { useState } from 'react';
import { Camera, GraduationCap, Shirt } from 'lucide-react';

/** Decorative catalog image; order labels and financial snapshots remain authoritative. */
export function CustomerOrderThumbnail({
  src,
  service,
}: {
  src?: string;
  service: 'yearbook' | 'concept' | 'rental';
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const Icon = service === 'rental' ? Shirt : service === 'concept' ? Camera : GraduationCap;
  return (
    <span className="customer-order-thumbnail" aria-hidden="true">
      <Icon size={24} strokeWidth={1.5} />
      {src && src !== failedSrc && (
        <img
          src={src}
          alt=""
          width={72}
          height={88}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}
