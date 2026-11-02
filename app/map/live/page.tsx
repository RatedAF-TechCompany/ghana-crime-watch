import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { LiveCrimeMap, type MapStory } from '@/components/LiveCrimeMap';
import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Live crime map: last 24 hours and 7 days',
  description: 'Where GhanaCrimes stories happened in the last 24 hours or 7 days, by region. Reported incidents on this site, not official statistics.',
  alternates: { canonical: `${BASE_URL}/map/live` },
};

type SP = Promise<{ window?: string }>;

export default async function LiveMapPage({ searchParams }: { searchParams: SP }) {
  const w = (await searchParams).window === '24h' ? '24h' : '7d';
  const hours = w === '24h' ? 24 : 168;
  const since = new Date(Math.floor(Date.now() / 300_000) * 300_000 - hours * 3600_000).toISOString();
  const { data } = await createServerClient().from('articles').select('title, category_slug, article_slug, region, published_at')
    .eq('is_published', true).not('region', 'is', null).gte('published_at', since).order('published_at', { ascending: false }).limit(500);
  const stories: MapStory[] = (data ?? []).map((a: any) => ({ title: a.title, href: `/${a.category_slug}/${a.article_slug}`, region: a.region, published_at: a.published_at }));
  const counts = Object.entries(stories.reduce<Record<string, number>>((m, s) => ((m[s.region] = (m[s.region] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  return (
    <Layout>
      <div className="mx-auto max-w-4xl">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Data</p>
        <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Live crime map</h1>
        <p className="mt-3 font-sans text-base text-muted-foreground">{stories.length} published GhanaCrimes stor{stories.length === 1 ? 'y' : 'ies'} with a named region in the last {w === '24h' ? '24 hours' : '7 days'}.</p>
        <p className="mt-2 rounded-sm border border-border bg-card p-3 font-sans text-xs text-muted-foreground">Reported incidents on this site, not official Ghana Police statistics. Markers sit on each region&apos;s capital; stories are tagged by region, not exact location.</p>
        <nav className="my-4 flex gap-2 font-sans text-sm" aria-label="Time window">
          {(['24h', '7d'] as const).map((k) => <Link key={k} href={`/map/live?window=${k}`} className={`rounded-full px-3 py-1 ${k === w ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{k === '24h' ? 'Last 24 hours' : 'Last 7 days'}</Link>)}
        </nav>
        <LiveCrimeMap stories={stories} />
        {counts.length > 0 && <ul className="mt-4 grid grid-cols-2 gap-1 font-sans text-sm sm:grid-cols-3">{counts.map(([r, n]) => <li key={r}>{r}: <b>{n}</b></li>)}</ul>}
        <p className="mt-6 font-sans text-sm"><Link href="/map" className="text-primary hover:underline">Longer periods and crime types</Link> · <Link href="/crime-this-week" className="text-primary hover:underline">Crime this week</Link></p>
      </div>
    </Layout>
  );
}
