'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-fetches the server-rendered live page every minute while a thread is live. */
export function LiveRefresher() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
