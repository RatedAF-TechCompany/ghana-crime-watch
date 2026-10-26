'use client';
import { useEffect, useState } from 'react';
import { relTime } from '@/lib/crime-labels';

/** "12 mins ago", re-rendered every 30s. Server renders the same text at request time. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  return <time dateTime={iso} suppressHydrationWarning className={className} title={new Date(iso).toUTCString()}>{relTime(iso, now)}</time>;
}
