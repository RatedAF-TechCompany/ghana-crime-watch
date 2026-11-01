import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { FilterChips } from '@/components/FilterChips';
import { BASE_URL } from '@/lib/utils';
import { REGIONS, TOPICS, getStoryCounts } from '@/lib/hubs';
import { PERIODS, crimeTypes, parsePeriod, pick, qs, regionCountsFor } from '@/lib/stats-filters';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Crime reporting statistics',
  description: 'Counts of GhanaCrimes stories by region, crime type and topic, with filters. From reported incidents on this site, not official Ghana Police statistics.',
  alternates: { canonical: `${BASE_URL}/statistics` },
};

function Bars({ rows, hrefFor }: { rows: { key: string; label: string; count: number }[]; hrefFor: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.every((r) => r.count === 0)) return <p className="font-sans text-sm text-muted-foreground">No stories match this filter.</p>;
  return (
    <ul className="space-y-2">
      {rows.filter((r) => r.count > 0).map((r) => (
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

type SP = Promise<{ region?: string; type?: string; days?: string }>;

export default async function StatisticsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const days = parsePeriod(sp.days);
  const counts = await getStoryCounts(new Date(Math.floor(Date.now() / 3600_000) * 3600_000 - days * 86400_000).toISOString());
  const types = crimeTypes(counts);
  const type = types.find((t) => t.key === pick(sp.type)) ?? null;
  const region = REGIONS.find((r) => r.slug === pick(sp.region)) ?? null;
  const period = PERIODS.find((p) => p.days === days)!.label;

  const regionRows = regionCountsFor(counts, type?.raw ?? null).map((r) => ({ key: r.slug, label: r.name, count: r.count })).sort((a, b) => b.count - a.count);
  const typeRows = types.map((t) => ({
    key: t.key, label: t.label,
    count: region ? counts.region_offence.filter(([reg, off]) => reg === region.name && t.raw.includes(off)).reduce((s, x) => s + x[2], 0) : t.count,
  })).sort((a, b) => b.count - a.count);
  const topicRows = TOPICS.map((t) => ({
    key: t.slug, label: t.label,
    count: region ? counts.topic_region.filter(([slug, reg]) => slug === t.slug && reg === region.name).reduce((s, x) => s + x[2], 0) : counts.topics[t.slug] ?? 0,
  })).sort((a, b) => b.count - a.count);

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Data</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Crime reporting statistics</h1>
        <p className="mt-3 rounded-sm border border-border bg-card p-3 font-sans text-sm text-muted-foreground">
          From reported incidents on this site, not official Ghana Police statistics. Figures count published
          GhanaCrimes stories in the last {period} ({counts.total.toLocaleString()} in total), not crimes. One incident may
          appear in several stories, and a story can match more than one topic.
        </p>
        <FilterChips label="Region" active={region?.slug ?? ''} options={[{ key: '', label: 'All regions', href: `/statistics${qs({ type: type?.key, days })}` }, ...REGIONS.map((r) => ({ key: r.slug, label: r.name, href: `/statistics${qs({ region: r.slug, days })}` }))]} />
        <FilterChips label="Crime type" active={type?.key ?? ''} options={[{ key: '', label: 'All types', href: `/statistics${qs({ region: region?.slug, days })}` }, ...types.map((t) => ({ key: t.key, label: t.label, href: `/statistics${qs({ type: t.key, days })}` }))]} />
        <FilterChips label="Period" active={String(days)} options={PERIODS.map((p) => ({ key: String(p.days), label: p.label, href: `/statistics${qs({ region: region?.slug, type: type?.key, days: p.days })}` }))} />

        {region && type && (
          <p className="mt-8 font-sans text-base">
            <strong>{counts.region_offence.filter(([reg, off]) => reg === region.name && type.raw.includes(off)).reduce((s, x) => s + x[2], 0)}</strong> {type.label.toLowerCase()} stories in {region.name} in the last {period}.
          </p>
        )}
        {!region && (
          <>
            <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Stories by region{type ? `: ${type.label}` : ''}</h2>
            <p className="mb-3 font-sans text-xs text-muted-foreground">Region named in the story.</p>
            <Bars rows={regionRows} hrefFor={(k) => `/statistics${qs({ region: k, days })}`} />
          </>
        )}
        {!type && (
          <>
            <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Stories by crime type{region ? `: ${region.name}` : ''}</h2>
            <p className="mb-3 font-sans text-xs text-muted-foreground">Main offence recorded for each story.</p>
            <Bars rows={typeRows} hrefFor={(k) => `/statistics${qs({ type: k, days })}`} />
            <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Stories by topic{region ? `: ${region.name}` : ''}</h2>
            <p className="mb-3 font-sans text-xs text-muted-foreground">Matched on words in the headline.</p>
            <Bars rows={topicRows} hrefFor={(k) => `/topics/${k}`} />
          </>
        )}
        <p className="mt-8 font-sans text-sm">
          <Link href={`/map${qs({ type: type?.key, days })}`} className="text-primary hover:underline">View on the crime map</Link>
          {region && <> · <Link href={`/regions/${region.slug}`} className="text-primary hover:underline">{region.name} stories</Link></>}
        </p>
      </div>
    </Layout>
  );
}
