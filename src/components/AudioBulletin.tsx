'use client';
import { useEffect, useState } from 'react';

type Meta = { day: string; title: string; headlines: string[]; url: string } | null;

/** Homepage player for the daily synthetic-voice bulletin. Hidden until a bulletin exists. */
export function AudioBulletin() {
  const [meta, setMeta] = useState<Meta>(null);
  useEffect(() => { fetch('/audio/latest.json').then((r) => (r.ok ? r.json() : null)).then(setMeta).catch(() => {}); }, []);
  if (!meta) return null;
  return (
    <section aria-labelledby="audio-bulletin" className="my-6 rounded-lg border p-4">
      <h2 id="audio-bulletin" className="text-lg font-semibold">Listen: today&apos;s crime bulletin</h2>
      <p className="mb-2 text-sm text-muted-foreground">{meta.title}. Read by a synthetic voice. <a className="underline" href="/podcast.xml">Podcast feed</a></p>
      <audio controls preload="none" src={meta.url} className="w-full" />
    </section>
  );
}
