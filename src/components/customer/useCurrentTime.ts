import { useEffect, useState } from 'react';

export function useCurrentTime() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return now;
}
