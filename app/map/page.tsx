import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { RegionMap } from '@/components/RegionMap';
import { FilterChips } from '@/components/FilterChips';
import { BASE_URL } from '@/lib/utils';
import { getStoryCounts } from '@/lib/hubs';
import { PERIODS, crimeTypes, parsePeriod, pick, qs, regionCountsFor } from '@/lib/stats-filters';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Ghana crime map by region',
  description: 'Published GhanaCrimes stories by region, filterable by crime type and period. From reported incidents on this site, not official Ghana Police statistics.',
  alternates: { canonical: `${BASE_URL}/map` },
};

type SP = Promise<{ type?: string; days?: string }>;

export default async function MapPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const days = parsePeriod(sp.days);
  const counts = await getStoryCounts(new Date(Math.floor(Date.now() / 3600_000) * 3600_000 - days * 86400_000).toISOString());
  const types = crimeTypes(counts);
  const type = types.find((t) => t.key === pick(sp.type)) ?? null;
  const cells = regionCountsFor(counts, type?.raw ?? null);
  const total = cells.reduce((s, c) => s + c.count, 0);
  const period = PERIODS.find((p) => p.days === days)!.label;
  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Data</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Crime map by region</h1>
        <p className="mt-3 font-sans text-base text-muted-foreground">
          Number of {type ? <strong>{type.label.toLowerCase()}</strong> : null} stories published on GhanaCrimes in the last {period}, by the region named in each story.
        </p>
        <p className="mt-2 rounded-sm border border-border bg-card p-3 font-sans text-xs text-muted-foreground">
          From reported incidents on this site, not official Ghana Police statistics. One incident can be covered by
          several stories, and stories that name no place are not counted. Regions are placed approximately.
        </p>
        <FilterChips label="Crime type" active={type?.key ?? ''} options={[{ key: '', label: 'All', href: `/map${qs({ days })}` }, ...types.map((t) => ({ key: t.key, label: t.label, href: `/map${qs({ type: t.key, days })}` }))]} />
        <FilterChips label="Period" active={String(days)} options={PERIODS.map((p) => ({ key: String(p.days), label: p.label, href: `/map${qs({ type: type?.key, days: p.days })}` }))} />
        <div className="mt-6">
          {total === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">No tagged stories match this filter yet.</p>
          ) : (
            <RegionMap cells={cells} />
          )}
        </div>
        <p className="mt-6 font-sans text-sm">
          <Link href={`/statistics${qs({ type: type?.key, days })}`} className="text-primary hover:underline">See these figures on the statistics page</Link>
        </p>
      </div>
    </Layout>
  );
}
