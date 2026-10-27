import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { WireList, type WireItem } from '@/components/WireList';
import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';
import { formatGhanaDate } from '@/lib/article-meta';
import { SPECIALIST, VERIFIED_ON } from '@/lib/emergency';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Scam alerts: fraud and cybercrime in Ghana',
  description: 'The latest reported scams and fraud cases in Ghana, how to check a seller on Fraud Watch, and official places to report a scam.',
  alternates: { canonical: `${BASE_URL}/scam-alerts`, types: { 'application/rss+xml': `${BASE_URL}/topics/cyber-fraud/rss.xml` } },
};

async function getScamStories(): Promise<WireItem[]> {
  const db = createServerClient();
  const { data, error } = await db.from('articles')
    .select('id, title, summary, category_slug, article_slug, published_at, region, offence_type, case_status')
    .eq('is_published', true)
    .or('category_slug.in.(fraud-scams,cybercrime),offence_type.in.(fraud,fraud_cyber,cybercrime,data_protection)')
    .order('published_at', { ascending: false }).limit(20);
  if (error) throw new Error(`scam stories: ${error.message}`);
  return (data ?? []) as WireItem[];
}

export default async function ScamAlertsPage() {
  const stories = await getScamStories();
  const top = stories[0];
  const thisWeek = top && Date.now() - new Date(top.published_at).getTime() < 7 * 86400000;
  const report = SPECIALIST.filter((c) => /Cyber|EOCO/.test(c.name));
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Scam alerts</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Scam alerts</h1>
        <p className="mt-3 text-sm text-muted-foreground">Fraud and cybercrime cases reported in Ghana, plus where to check a seller and how to report a scam. Everyone charged is presumed innocent until proven guilty.</p>

        {top && (
          <section className="mt-6 rounded-md border-l-4 border-primary bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{thisWeek ? 'Scam of the week' : 'Latest scam report'}</p>
            <Link href={`/${top.category_slug}/${top.article_slug}`} className="mt-1 block font-serif text-xl font-bold hover:text-primary">{top.title}</Link>
            {top.summary && <p className="mt-1 text-sm text-foreground/80">{top.summary}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{formatGhanaDate(top.published_at)}. Picked from our published reports, each linked to its sources.</p>
          </section>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/fraud-watch" className="rounded-md border border-border p-3 hover:border-primary"><strong className="block">Fraud Watch</strong><span className="text-xs text-muted-foreground">Check an online seller before you pay.</span></Link>
          <Link href="/fraud-watch/report" className="rounded-md border border-border p-3 hover:border-primary"><strong className="block">Report a suspicious account</strong><span className="text-xs text-muted-foreground">Add a seller to Fraud Watch.</span></Link>
          <Link href="/tips" className="rounded-md border border-border p-3 hover:border-primary"><strong className="block">Tell our newsroom</strong><span className="text-xs text-muted-foreground">Send a scam tip. You can stay anonymous.</span></Link>
        </section>

        <section className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
          <h2 className="font-serif text-lg font-bold">Report a scam to the authorities</h2>
          <ul className="mt-2 space-y-2">
            {report.map((c) => (
              <li key={c.name}><strong>{c.name}</strong>: {c.lines.map((l) => `${l.label} ${l.value}`).join(' · ')}. <a className="text-primary underline" href={c.source.href} target="_blank" rel="noopener">Source</a></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Checked against official pages on {VERIFIED_ON}. See <Link className="underline" href="/emergency-contacts">all emergency contacts</Link> and our guide on <Link className="underline" href="/explainers/how-to-report-cybercrime-in-ghana">how to report cybercrime</Link>.</p>
        </section>

        <h2 className="mt-8 font-serif text-xl font-bold">Recent fraud and cybercrime reports</h2>
        <p className="mb-3 text-xs text-muted-foreground"><a className="underline" href="/topics/cyber-fraud/rss.xml">RSS feed for these stories</a></p>
        {stories.length ? <WireList items={stories.slice(1)} /> : <p className="text-sm text-muted-foreground">No reports yet.</p>}
      </div>
    </Layout>
  );
}
