import { useEffect } from 'react';

let pendingPopGuard: ((event: PopStateEvent) => void) | undefined;
if (typeof window !== 'undefined')
  window.addEventListener('popstate', (event) => pendingPopGuard?.(event), true);
export function usePortfolioUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const currentIndex: unknown = window.history.state?.idx;
    let restoring = false;
    const confirm = () =>
      window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?');
    const pop = (event: PopStateEvent) => {
      if (restoring) {
        restoring = false;
        return;
      }
      const nextIndex: unknown = event.state?.idx;
      if (
        typeof currentIndex !== 'number' ||
        typeof nextIndex !== 'number' ||
        currentIndex === nextIndex
      )
        return;
      if (!confirm()) {
        event.stopImmediatePropagation();
        restoring = true;
        window.history.go(currentIndex - nextIndex);
      }
    };
    const leave = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (
        !link ||
        link.getAttribute('target') === '_blank' ||
        link.getAttribute('href')?.startsWith('#')
      )
        return;
      if (!confirm()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', leave, true);
    pendingPopGuard = pop;
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', leave, true);
      if (pendingPopGuard === pop) pendingPopGuard = undefined;
    };
  }, [dirty]);
}
