'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';

type Suggestion = { title: string; category_slug: string; article_slug: string };

/** Search box with typo-tolerant title suggestions (pg_trgm via the search_suggest RPC). */
export function SearchAutocomplete({ defaultValue = '' }: { defaultValue?: string }) {
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || term === defaultValue.trim()) { setItems([]); return; }
    const t = setTimeout(async () => {
      const { data } = await (supabase as any).rpc('search_suggest', { q: term });
      setItems((data ?? []) as Suggestion[]);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [q, defaultValue]);
  return (
    <div className="relative flex-1">
      <input name="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length && setOpen(true)} autoComplete="off" placeholder="Search GhanaCrimes (typos are fine)" aria-autocomplete="list"
        className="h-11 w-full rounded-md border border-input bg-background px-3 font-sans text-sm" />
      {open && items.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 top-12 z-20 rounded-md border border-border bg-card shadow-lg">
          {items.map((s) => (
            <li key={s.article_slug}>
              <Link href={`/${s.category_slug}/${s.article_slug}`} className="block px-3 py-2 font-sans text-sm hover:bg-muted">{s.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
