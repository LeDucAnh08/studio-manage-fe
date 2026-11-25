import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackgroundOperation, backgroundJobService } from '../services/backgroundJobService';
import { SESSION_ENDED } from '../services/authSession';

export function useAlbumOperation(
  service: 'yearbook' | 'concept',
  id: string,
  enabled: boolean,
  onComplete: () => Promise<void>,
) {
  const [job, setJob] = useState<BackgroundOperation | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const current = useRef<BackgroundOperation | null>(null);
  const complete = useRef(onComplete);
  const generation = useRef(0);
  const identity = useRef({ service, id });
  const stopped = useRef(false);
  useLayoutEffect(() => {
    complete.current = onComplete;
    identity.current = { service, id };
  }, [onComplete, service, id]);
  const watch = useCallback((next: BackgroundOperation) => {
    if (
      stopped.current ||
      next.orderId !== identity.current.id ||
      next.service !== identity.current.service
    )
      return;
    current.current = next;
    setJob(next);
    if (next.status === 'succeeded') void complete.current().catch(() => {});
  }, []);
  useEffect(() => {
    const abort = new AbortController(),
      epoch = ++generation.current;
    current.current = null;
    stopped.current = false;
    setJob(null);
    setSessionEnded(false);
    const stop = () => {
      abort.abort();
      stopped.current = true;
      generation.current++;
      setSessionEnded(true);
      setJob(null);
    };
    window.addEventListener(SESSION_ENDED, stop);
    if (enabled)
      void backgroundJobService
        .latest(service, id, abort.signal)
        .then((next) => {
          if (!abort.signal.aborted && generation.current === epoch && !current.current) {
            current.current = next;
            setJob(next);
          }
        })
        .catch(() => {
          /* Legacy servers and unavailable status never discard album drafts. */
        });
    return () => {
      abort.abort();
      window.removeEventListener(SESSION_ENDED, stop);
    };
  }, [service, id, enabled]);
  const jobId = job?.id,
    jobStatus = job?.status,
    jobOrder = job?.orderId,
    jobService = job?.service;
  useEffect(() => {
    if (
      !enabled ||
      sessionEnded ||
      !jobId ||
      jobOrder !== id ||
      jobService !== service ||
      !['pending', 'running'].includes(jobStatus || '')
    )
      return;
    const abort = new AbortController(),
      epoch = generation.current;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await backgroundJobService.get(jobId, abort.signal);
        if (abort.signal.aborted || epoch !== generation.current) return;
        current.current = next;
        setJob(next);
        if (next.status === 'succeeded') {
          await complete.current();
          return;
        }
        if (next.status === 'failed') return;
      } catch (error) {
        if (abort.signal.aborted || epoch !== generation.current) return;
        const status = (error as { response?: { status?: number } }).response?.status;
        if ([401, 403, 404].includes(status || 0)) {
          current.current = null;
          setJob(null);
          return;
        }
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void poll(), 2000);
    };
    timer = setTimeout(() => void poll(), 500);
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [jobId, jobStatus, jobOrder, jobService, id, service, enabled, sessionEnded]);
  const pending = !!job && ['pending', 'running'].includes(job.status);
  const message =
    job?.status === 'pending'
      ? 'Đang chờ đồng bộ ảnh. Bạn có thể quay lại trang sau.'
      : job?.status === 'running'
        ? 'Đang đồng bộ ảnh. Danh sách hiện tại được giữ nguyên.'
        : job?.status === 'failed'
          ? `${job.message} Kiểm tra thông tin rồi nhấn Đồng bộ để gửi yêu cầu mới.`
          : job?.status === 'succeeded'
            ? 'Đã đồng bộ ảnh.'
            : '';
  return { watch, pending, message, failed: job?.status === 'failed' };
}
