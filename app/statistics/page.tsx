import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import { getRegionCounts, getTopicCounts } from '@/lib/hubs';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Crime reporting statistics',
  description: 'Counts of GhanaCrimes stories by region and topic. From reported incidents on this site, not official Ghana Police statistics.',
  alternates: { canonical: `${BASE_URL}/statistics` },
};

function Bars({ rows, hrefFor }: { rows: { key: string; label: string; count: number }[]; hrefFor: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 font-sans text-sm">
          <Link href={hrefFor(r.key)} className="truncate text-foreground hover:text-primary">{r.label}</Link>
          <div className="h-3 rounded-sm bg-muted">
            <div className="h-3 rounded-sm bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="text-right tabular-nums text-muted-foreground">{r.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function StatisticsPage() {
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const [regions, topics] = await Promise.all([getRegionCounts(since), getTopicCounts(since)]);
  const regionRows = regions.map((r) => ({ key: r.slug, label: r.name, count: r.count })).sort((a, b) => b.count - a.count);
  const topicRows = topics.map((t) => ({ key: t.slug, label: t.label, count: t.count })).sort((a, b) => b.count - a.count);
  const empty = regionRows.every((r) => r.count === 0) && topicRows.every((r) => r.count === 0);
  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Data</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Crime reporting statistics</h1>
        <p className="mt-3 rounded-sm border border-border bg-card p-3 font-sans text-sm text-muted-foreground">
          From reported incidents on this site, not official Ghana Police statistics. Figures count published
          GhanaCrimes stories in the last 90 days, not crimes. One incident may appear in several stories, and a story
          can match more than one topic.
        </p>
        {empty ? (
          <p className="mt-6 font-sans text-sm text-muted-foreground">Not enough stories in the last 90 days to show figures.</p>
        ) : (
          <>
            <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Stories by region</h2>
            <p className="mb-3 font-sans text-xs text-muted-foreground">Region named in the headline or summary.</p>
            <Bars rows={regionRows} hrefFor={(k) => `/regions/${k}`} />
            <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Stories by topic</h2>
            <p className="mb-3 font-sans text-xs text-muted-foreground">Matched on words in the headline.</p>
            <Bars rows={topicRows} hrefFor={(k) => `/topics/${k}`} />
          </>
        )}
        <p className="mt-8 font-sans text-sm"><Link href="/map" className="text-primary hover:underline">View the crime map</Link></p>
      </div>
    </Layout>
  );
}
