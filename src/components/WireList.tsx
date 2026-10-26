import Link from 'next/link';
import { RelativeTime } from '@/components/RelativeTime';
import { offenceInfo, regionInfo } from '@/lib/crime-labels';
import { getCategoryLabel } from '@/lib/categories';

export type WireItem = { id: string; title: string; summary?: string | null; category_slug: string; article_slug: string; published_at: string; region?: string | null; offence_type?: string | null };

export function WireList({ items, showSummary = true }: { items: WireItem[]; showSummary?: boolean }) {
  return (
    <ol className="divide-y divide-border border-y border-border">
      {items.map((a) => {
        const reg = regionInfo(a.region);
        const off = offenceInfo(a.offence_type);
        const fresh = Date.now() - new Date(a.published_at).getTime() < 2 * 3600_000;
        return (
          <li key={a.id} className="flex gap-4 py-4">
            <div className="w-20 shrink-0 pt-0.5 font-sans text-xs tabular-nums text-muted-foreground">
              {fresh && <span className="mb-1 block font-bold uppercase tracking-wider text-primary">New</span>}
              <RelativeTime iso={a.published_at} />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide">
                {off ? <Link href={off.href} className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{off.label}</Link>
                  : <Link href={`/${a.category_slug}`} className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{getCategoryLabel(a.category_slug)}</Link>}
                {reg && <Link href={`/regions/${reg.slug}`} className="rounded bg-muted px-1.5 py-0.5 text-foreground/80">{reg.name}</Link>}
              </div>
              <Link href={`/${a.category_slug}/${a.article_slug}`} className="font-headline text-lg font-bold leading-snug hover:text-primary">{a.title}</Link>
              {showSummary && a.summary && <p className="mt-1 line-clamp-2 font-body text-sm text-foreground/75">{a.summary}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
