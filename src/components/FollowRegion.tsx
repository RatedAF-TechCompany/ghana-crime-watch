'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { REGIONS } from '@/lib/hubs';
import { getMyRegion, setMyRegion, MY_REGION_EVENT } from '@/lib/my-region';
import { getRelativeTime } from '@/lib/time';

type Row = { id: string; title: string; category_slug: string; article_slug: string; published_at: string };

/** "Follow my region": personalises the homepage from localStorage; nothing is stored server-side. */
export function FollowRegion() {
  const [region, setRegion] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setRegion(getMyRegion());
    sync(); setReady(true);
    window.addEventListener(MY_REGION_EVENT, sync);
    return () => window.removeEventListener(MY_REGION_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!region) { setRows([]); return; }
    supabase.from('articles').select('id, title, category_slug, article_slug, published_at').eq('is_published', true)
      .eq('region', region).order('published_at', { ascending: false }).limit(5)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [region]);
  if (!ready) return null;
  const slug = REGIONS.find((r) => r.name === region)?.slug;
  return (
    <section aria-labelledby="my-region" className="mb-10 rounded-md border border-border px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="my-region" className="font-sans text-xs font-bold uppercase tracking-[0.16em]">{region ? `Your region: ${region}` : 'Follow your region'}</h2>
        <select aria-label="Choose your region" value={region ?? ''} onChange={(e) => setMyRegion(e.target.value || null)} className="h-8 rounded-md border border-input bg-background px-2 font-sans text-xs">
          <option value="">{region ? 'Stop following' : 'Choose a region'}</option>
          {REGIONS.map((r) => <option key={r.slug} value={r.name}>{r.name}</option>)}
        </select>
      </div>
      {region && (rows.length ? (
        <ul className="space-y-1.5">
          {rows.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-3">
              <Link href={`/${a.category_slug}/${a.article_slug}`} className="font-headline text-base font-bold leading-snug hover:text-primary">{a.title}</Link>
              <span className="shrink-0 font-sans text-[11px] text-muted-fg">{getRelativeTime(a.published_at)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="font-sans text-sm text-muted-fg">No published stories tagged {region} yet.</p>)}
      {region && slug && <Link href={`/regions/${slug}`} className="mt-2 inline-block font-sans text-xs font-semibold text-primary underline">All {region} stories</Link>}
      {!region && <p className="font-sans text-sm text-muted-fg">Pick a region to see its latest stories here. Your choice stays on this device.</p>}
    </section>
  );
}
