import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { createServerClient } from '@/lib/supabase/server';
import { offenceInfo } from '@/lib/crime-labels';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Crime this week in Ghana: the numbers',
  description: 'GhanaCrimes stories published in the last 7 days by region and crime type, compared with the 7 days before. Reported incidents on this site, not official statistics.',
  alternates: { canonical: `${BASE_URL}/crime-this-week` },
};

type Row = { region: string | null; offence_type: string | null; published_at: string };

function tally(rows: Row[], key: (r: Row) => string | null) {
  const m: Record<string, number> = {};
  for (const r of rows) { const k = key(r); if (k) m[k] = (m[k] ?? 0) + 1; }
  return m;
}

export default async function CrimeThisWeek() {
  const now = Math.floor(Date.now() / 3600_000) * 3600_000;
  const start = new Date(now - 14 * 86400_000).toISOString();
  const cut = new Date(now - 7 * 86400_000).toISOString();
  const { data } = await createServerClient().from('articles').select('region, offence_type, published_at').eq('is_published', true).gte('published_at', start).limit(2000);
  const rows = (data ?? []) as Row[];
  const thisW = rows.filter((r) => r.published_at >= cut), lastW = rows.filter((r) => r.published_at < cut);
  const label = (k: string) => offenceInfo(k)?.label ?? k.replace(/_/g, ' ');
  const sections = [
    { title: 'By region', a: tally(thisW, (r) => r.region), b: tally(lastW, (r) => r.region), fmt: (k: string) => k },
    { title: 'By crime type', a: tally(thisW, (r) => r.offence_type), b: tally(lastW, (r) => r.offence_type), fmt: label },
  ];
  const fmtD = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' });
  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Data</p>
        <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Crime this week</h1>
        <p className="mt-3 font-sans text-base">{thisW.length} stories published {fmtD(cut)} to {fmtD(new Date(now).toISOString())}, against {lastW.length} in the 7 days before.</p>
        <p className="mt-2 rounded-sm border border-border bg-card p-3 font-sans text-xs text-muted-foreground">Counts of GhanaCrimes stories, not incidents and not official Ghana Police statistics. One incident can be covered by several stories; stories with no region or type are not counted in that table.</p>
        {sections.map((s) => {
          const keys = [...new Set([...Object.keys(s.a), ...Object.keys(s.b)])].sort((x, y) => (s.a[y] ?? 0) - (s.a[x] ?? 0));
          return (
            <section key={s.title} className="mt-8">
              <h2 className="mb-2 font-headline text-xl font-bold">{s.title}</h2>
              {keys.length === 0 ? <p className="font-sans text-sm text-muted-foreground">No tagged stories.</p> : (
                <table className="w-full font-sans text-sm">
                  <thead><tr className="border-b text-left"><th className="py-1">{s.title.replace('By ', '')}</th><th className="text-right">This week</th><th className="text-right">Last week</th><th className="text-right">Change</th></tr></thead>
                  <tbody>{keys.map((k) => { const a = s.a[k] ?? 0, b = s.b[k] ?? 0, d = a - b; return (
                    <tr key={k} className="border-b border-border/50"><td className="py-1">{s.fmt(k)}</td><td className="text-right tabular-nums">{a}</td><td className="text-right tabular-nums">{b}</td><td className="text-right tabular-nums">{d > 0 ? `+${d}` : d}</td></tr>); })}</tbody>
                </table>)}
            </section>
          );
        })}
        <p className="mt-8 font-sans text-sm"><Link href="/map/live" className="text-primary hover:underline">Live crime map</Link> · <Link href="/statistics" className="text-primary hover:underline">All statistics</Link></p>
      </div>
    </Layout>
  );
}
