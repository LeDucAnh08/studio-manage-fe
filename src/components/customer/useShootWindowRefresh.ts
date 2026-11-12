import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { WorkflowSummary } from '@/services/bookingWorkflowService';

// Re-run server-side filters and pagination when a displayed shoot changes stage.
export function useShootWindowRefresh(
  items: WorkflowSummary[],
  reload: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    const refresh = () => reload((value) => value + 1);
    const now = Date.now();
    const next = Math.min(
      ...items
        .flatMap((item) => [
          Date.parse(item.shootWindow?.startAt || ''),
          Date.parse(item.shootWindow?.endAt || ''),
        ])
        .filter((time) => time > now),
    );
    const timer = Number.isFinite(next)
      ? window.setTimeout(refresh, Math.min(next - now, 2147483647))
      : undefined;
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [items, reload]);
}
