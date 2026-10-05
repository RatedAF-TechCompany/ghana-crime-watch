import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { RegionMap } from '@/components/RegionMap';
import { BASE_URL } from '@/lib/utils';
import { getRegionCounts } from '@/lib/hubs';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Ghana crime map by region',
  description: 'Published GhanaCrimes stories by region over the last 12 months. From reported incidents on this site, not official Ghana Police statistics.',
  alternates: { canonical: `${BASE_URL}/map` },
};

export default async function MapPage() {
  const since = new Date(Date.now() - 365 * 86400_000).toISOString();
  const cells = await getRegionCounts(since);
  const total = cells.reduce((s, c) => s + c.count, 0);
  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Data</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Crime map by region</h1>
        <p className="mt-3 font-sans text-base text-muted-foreground">
          Number of stories published on GhanaCrimes in the last 12 months, by the region named in each story.
        </p>
        <p className="mt-2 rounded-sm border border-border bg-card p-3 font-sans text-xs text-muted-foreground">
          From reported incidents on this site, not official Ghana Police statistics. One incident can be covered by
          several stories, and stories that name no place are not counted. Regions are placed approximately.
        </p>
        <div className="mt-6">
          {total === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">Not enough tagged stories yet to draw the map.</p>
          ) : (
            <RegionMap cells={cells} />
          )}
        </div>
        <p className="mt-6 font-sans text-sm">
          <Link href="/statistics" className="text-primary hover:underline">See more figures on the statistics page</Link>
        </p>
      </div>
    </Layout>
  );
}
