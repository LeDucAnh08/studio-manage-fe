import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  bookingDeliveryService,
  deliveryError,
  type DeliveryPhoto,
} from '@/services/bookingDeliveryService';
import { createWorkflowRequestId } from '@/services/bookingWorkflowService';
import { DeliveryThumbnail } from './DeliveryPhotoGallery';
import { OrderButton } from './CustomerOrderControls';
import '../../styles/booking-delivery.css';

export function DeliveryPhotoUpload({
  bookingId,
  previous = [],
  onChange,
  onBusy,
}: {
  bookingId: string;
  previous?: DeliveryPhoto[];
  onChange: (ids: string[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const inputId = useId();
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [pending, setPending] = useState<Array<{ file: File; key: string }>>([]);
  const [restoring, setRestoring] = useState(true);
  const refs = useRef({ onChange, onBusy });
  useLayoutEffect(() => {
    refs.current = { onChange, onBusy };
  }, [onChange, onBusy]);
  const values = useRef<DeliveryPhoto[]>([]),
    alive = useRef(true),
    controller = useRef<AbortController>();
  const base = useRef(previous.filter((photo) => photo.source !== 'drive'));
  const apply = (next: DeliveryPhoto[]) => {
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
    void bookingDeliveryService
      .drafts(bookingId, request.signal)
      .then((drafts) => {
        if (!active) return;
        const merged = [
          ...base.current,
          ...drafts.filter((photo) => !base.current.some((old) => old.id === photo.id)),
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
  }, [bookingId]);
  const upload = async (items: Array<{ file: File; key: string }>) => {
    setBusy(true);
    refs.current.onBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      for (let index = 0; index < items.length; index++) {
        try {
          const photo = await bookingDeliveryService.upload(
            bookingId,
            items[index].file,
            items[index].key,
            controller.current.signal,
          );
          if (!alive.current) return;
          if (!values.current.some((old) => old.id === photo.id)) apply([...values.current, photo]);
          setDraftIds((ids) => [...new Set([...ids, photo.id])]);
          setPending(items.slice(index + 1));
        } catch (error) {
          if (alive.current) {
            setPending(items.slice(index));
            setError(deliveryError(error));
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
            files.some((file) => file.size > 20 * 1024 * 1024) ||
            values.current.length + files.length > 500
          ) {
            setError('Chỉ chọn ảnh tối đa 20 MB, không vượt quá 500 ảnh/bản.');
            return;
          }
          const items = files.map((file) => ({ file, key: createWorkflowRequestId() }));
          setPending(items);
          void upload(items);
        }}
      />
      <p role="status" className="text-sm">
        {busy ? 'Đang tải ảnh… ' : ''}
        {photos.length} ảnh đã tải{pending.length > 0 ? ` · ${pending.length} ảnh đang chờ` : ''}
      </p>
      {previous.length > 0 && (
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
            <DeliveryThumbnail bookingId={bookingId} photo={photo} />
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
                    await bookingDeliveryService.remove(bookingId, photo.id);
                  if (!alive.current) return;
                  apply(values.current.filter((item) => item.id !== photo.id));
                } catch (error) {
                  setError(deliveryError(error));
                } finally {
                  if (alive.current) {
                    setBusy(false);
                    refs.current.onBusy(false);
                  }
                }
              }}
            >
              Bỏ ảnh {photo.name}
            </OrderButton>
          </div>
        ))}
      </div>
    </div>
  );
}
