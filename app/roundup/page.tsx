import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { CaseStatusBadge } from '@/components/CaseStatusBadge';
import { createServerClient } from '@/lib/supabase/server';
import { REGIONS } from '@/lib/hubs';
import { offenceInfo } from '@/lib/crime-labels';
import { BASE_URL } from '@/lib/utils';
import { formatGhanaDate } from '@/lib/article-meta';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Weekly regional crime roundup',
  description: 'Every crime, police and court story GhanaCrimes published in the past seven days, grouped by region.',
  alternates: { canonical: `${BASE_URL}/roundup` },
};

type Row = { id: string; title: string; category_slug: string; article_slug: string; published_at: string; region: string | null; offence_type: string | null; case_status: string | null };

export default async function RoundupPage() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400000);
  const { data, error } = await createServerClient().from('articles')
    .select('id, title, category_slug, article_slug, published_at, region, offence_type, case_status')
    .eq('is_published', true).gte('published_at', start.toISOString()).lte('published_at', end.toISOString())
    .order('published_at', { ascending: false }).limit(300);
  if (error) throw new Error(`roundup: ${error.message}`);
  const rows = (data ?? []) as Row[];
  const groups = [...REGIONS.map((r) => ({ name: `${r.name} Region`, href: `/regions/${r.slug}`, rows: rows.filter((a) => a.region === r.name) })),
    { name: 'National or region not stated', href: '/latest', rows: rows.filter((a) => !REGIONS.some((r) => r.name === a.region)) }]
    .filter((g) => g.rows.length).sort((a, b) => b.rows.length - a.rows.length);
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Weekly roundup</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">The week in crime, region by region</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'story' : 'stories'} published from {formatGhanaDate(start.toISOString())} to {formatGhanaDate(end.toISOString())}. This list is generated automatically from our published reports and adds nothing to them.
          Everyone charged is presumed innocent until proven guilty. <Link className="underline" href="/statistics?days=30">See statistics</Link>.
        </p>
        {groups.map((g) => (
          <section key={g.name} className="mt-8">
            <h2 className="font-serif text-xl font-bold"><Link href={g.href} className="hover:text-primary">{g.name}</Link> <span className="text-sm font-normal text-muted-foreground">({g.rows.length})</span></h2>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {g.rows.map((a) => (
                <li key={a.id} className="py-2">
                  <span className="mr-2 text-xs text-muted-foreground">{offenceInfo(a.offence_type)?.label ?? ''}</span>
                  <CaseStatusBadge status={a.case_status} />
                  <Link href={`/${a.category_slug}/${a.article_slug}`} className="mt-0.5 block font-serif text-base font-bold hover:text-primary">{a.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!rows.length && <p className="mt-6 text-sm text-muted-foreground">No stories were published in the past seven days.</p>}
      </div>
    </Layout>
  );
}
