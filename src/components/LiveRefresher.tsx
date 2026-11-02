'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-fetches the server-rendered live page every minute while a thread is live and the tab is visible. */
export function LiveRefresher() {
  const router = useRouter();
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!t) t = setInterval(() => router.refresh(), 60_000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVis = () => {
      if (document.visibilityState === 'visible') { router.refresh(); start(); } else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [router]);
  return null;
}
