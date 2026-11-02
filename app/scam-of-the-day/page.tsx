import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 1800;

async function pick() {
  const since = new Date(Date.now() - 72 * 3600_000).toISOString();
  const { data } = await createServerClient().from('articles').select('id, title, summary, category_slug, article_slug, published_at')
    .eq('is_published', true).or('offence_type.eq.fraud_cyber,category_slug.eq.fraud-scams').gte('published_at', since)
    .order('published_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function generateMetadata(): Promise<Metadata> {
  const a = await pick();
  const img = a ? `${BASE_URL}/api/og/scam-${a.id}` : undefined;
  return { title: 'Scam of the day', description: a?.summary ?? 'The latest fraud and scam report from GhanaCrimes.', alternates: { canonical: `${BASE_URL}/scam-of-the-day` },
    openGraph: img ? { images: [{ url: img, width: 1200, height: 675 }] } : undefined, twitter: img ? { card: 'summary_large_image', images: [img] } : undefined };
}

export default async function ScamOfTheDay() {
  const a = await pick();
  const url = a ? `${BASE_URL}/${a.category_slug}/${a.article_slug}` : null;
  const share = a ? `https://wa.me/?text=${encodeURIComponent(`Scam alert: ${a.title} ${BASE_URL}/scam-of-the-day`)}` : null;
  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Fraud Watch</p>
        <h1 className="mt-2 font-serif text-3xl font-bold">Scam of the day</h1>
        {!a ? <p className="mt-4 font-sans">No new scam report in the last 3 days. See <Link className="underline" href="/scam-alerts">all scam alerts</Link>.</p> : (<>
          <img src={`/api/og/scam-${a.id}`} alt={a.title} width={1200} height={675} className="mt-4 w-full rounded-md border" />
          <p className="mt-4 font-body text-lg">{a.summary}</p>
          <div className="mt-4 flex flex-wrap gap-3 font-sans text-sm">
            <a href={share!} target="_blank" rel="noopener" className="rounded-md bg-green-700 px-4 py-2 font-semibold text-white">Share on WhatsApp</a>
            <a href={`/api/og/scam-${a.id}`} download={`ghanacrimes-scam-${a.id}.png`} className="rounded-md bg-muted px-4 py-2">Download card for Status</a>
            <Link href={url!.replace(BASE_URL, '')} className="rounded-md border px-4 py-2">Read the full report</Link>
          </div>
        </>)}
        <p className="mt-6 font-sans text-xs text-muted-fg">Suspects named in reports are innocent unless convicted. Check a number in <Link className="underline" href="/fraud-watch/directory">Fraud Watch</Link>.</p>
      </div>
    </Layout>
  );
}
