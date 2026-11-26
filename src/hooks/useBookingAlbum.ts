import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { albumClient, albumError, type BookingAlbum } from '@/services/bookingAlbumService';
import { isQueuedAlbum } from '@/services/backgroundJobService';
import { bookingWorkflowService, createWorkflowRequestId } from '@/services/bookingWorkflowService';
import { useAlbumOperation } from './useAlbumOperation';

type AlbumCallbacks = {
  reloadCount?: number;
  onLoad?: (album: BookingAlbum | null) => void;
  onChange?: (album: BookingAlbum | null) => void;
  onSync?: (album: BookingAlbum) => void;
};

export function useBookingAlbum(
  client: ReturnType<typeof albumClient>,
  staffOrderId: string | undefined,
  callbacks: AlbumCallbacks = {},
) {
  const [album, setAlbum] = useState<BookingAlbum | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [exportText, setExportText] = useState('');
  const [extension, setExtension] = useState(true);
  const session = useRef<AbortController>();
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const hydrated = useRef(false);
  const listeners = useRef(callbacks);
  useLayoutEffect(() => {
    listeners.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const request = new AbortController();
    session.current = request;
    inFlight.current = false;
    hydrated.current = false;
    keys.current.clear();
    setLoaded(false);
    setLoadFailed(false);
    setSaving(false);
    setAlbum(null);
    setError('');
    setNotice('');
    setShareUrl('');
    setExportText('');
    void client
      .get(request.signal)
      .then((next) => {
        if (request.signal.aborted) return;
        hydrated.current = true;
        setAlbum(next);
        listeners.current.onLoad?.(next);
        listeners.current.onChange?.(next);
      })
      .catch((e) => {
        if (!request.signal.aborted) {
          setLoadFailed(true);
          setError(albumError(e));
        }
      })
      .finally(() => {
        if (!request.signal.aborted) setLoaded(true);
      });
    return () => request.abort();
  }, [client]);

  const apply = useCallback((next: BookingAlbum | null) => {
    setAlbum(next);
    listeners.current.onChange?.(next);
  }, []);
  const refresh = useCallback(async () => {
    const request = session.current;
    if (!request || request.signal.aborted) return;
    try {
      const next = await client.get(request.signal);
      if (request.signal.aborted) return;
      if (!hydrated.current) {
        hydrated.current = true;
        listeners.current.onLoad?.(next);
        setLoadFailed(false);
      }
      apply(next);
      setError('');
      if (!next?.shared) setShareUrl('');
      return next;
    } catch (e) {
      if (!request.signal.aborted) setError(albumError(e));
    }
  }, [client, apply]);
  const reloadCount = callbacks.reloadCount;
  const lastReload = useRef(reloadCount);
  useEffect(() => {
    if (lastReload.current === reloadCount) return;
    lastReload.current = reloadCount;
    void refresh();
  }, [reloadCount, refresh]);
  const background = useAlbumOperation('yearbook', staffOrderId || '', !!staffOrderId, async () => {
    const next = await refresh();
    if (next) listeners.current.onSync?.(next);
  });
  const busy = saving || background.pending;

  const mutate = async <T>(
    signature: string,
    run: (key: string, signal: AbortSignal) => Promise<T>,
  ) => {
    const request = session.current;
    if (!request || request.signal.aborted || inFlight.current || background.pending) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    if (!keys.current.has(signature)) keys.current.set(signature, createWorkflowRequestId());
    try {
      const next = await run(keys.current.get(signature)!, request.signal);
      if (request.signal.aborted) return;
      keys.current.delete(signature);
      return next;
    } catch (e) {
      if (!request.signal.aborted) setError(albumError(e));
    } finally {
      if (!request.signal.aborted) {
        inFlight.current = false;
        setSaving(false);
      }
    }
  };
  const command = async (operation: string, data: Record<string, unknown> = {}) => {
    const payload = { ...data, expectedVersion: album?.version || 0 };
    return mutate(JSON.stringify([operation, payload]), async (key, signal) => {
      const next = await client.command(operation, payload, key);
      if (signal.aborted) return;
      if (isQueuedAlbum(next)) {
        background.watch(next.backgroundOperation);
        return;
      }
      apply(next);
      setNotice('Đã lưu.');
      if (next.token)
        setShareUrl(`${window.location.origin}/albums/${next.publicId}#access=${next.token}`);
      else if (operation === 'share' || operation === 'revoke') setShareUrl('');
      if (['configure', 'sync', 'delivery-sync'].includes(operation))
        listeners.current.onSync?.(next);
      return next;
    });
  };
  const workflowAction = async (
    version: number,
    action: 'progress.update' | 'delivery.revision.start',
    data: Record<string, unknown>,
  ) => {
    if (!staffOrderId) return;
    const expectedVersion = Math.max(version, album?.workflowVersion ?? 0);
    return mutate(JSON.stringify([action, expectedVersion, data]), async (key, signal) => {
      const next = await bookingWorkflowService.act(
        staffOrderId,
        expectedVersion,
        action,
        data,
        key,
      );
      if (signal.aborted) return;
      await refresh();
      if (signal.aborted) return;
      setNotice(
        action === 'delivery.revision.start'
          ? 'Đã ghi nhận bắt đầu chỉnh lại. Chuyển sang hậu kỳ để chuẩn bị bản mới.'
          : data.status === 'editing'
            ? 'Đã chuyển sang hậu kỳ. Bạn có thể chuẩn bị bản bàn giao mới.'
            : data.driveAlbum
              ? 'Đã gửi bản bàn giao mới trên cùng link album.'
              : 'Đã gửi bản bàn giao mới.',
      );
      return next;
    });
  };
  const exportNames = async (round?: number) => {
    const request = session.current;
    setError('');
    try {
      const result = await client.export(extension, round);
      if (request && !request.signal.aborted) {
        setExportText(result.text);
        if (!result.text) setNotice('Chưa có tên file đã chọn.');
      }
    } catch (e) {
      if (request && !request.signal.aborted) setError(albumError(e));
    }
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
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

  return {
    album,
    loaded,
    loadFailed,
    busy,
    background,
    error,
    setError,
    notice,
    shareUrl,
    command,
    refresh,
    workflowAction,
    extension,
    setExtension,
    exportText,
    exportNames,
    copy,
    downloadText,
  };
}
