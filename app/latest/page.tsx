import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import { getLatestWire } from '@/lib/server-data';
import { WireList } from '@/components/WireList';
import { AutoRefresh } from '@/components/AutoRefresh';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live Crime Wire: Latest Ghana Crime News, Minute by Minute',
  description: 'Every new GhanaCrimes story, newest first: arrests, court cases, fraud and police reports from across Ghana, with region and crime-type labels.',
  alternates: { canonical: `${BASE_URL}/latest`, types: { 'application/rss+xml': `${BASE_URL}/latest/rss.xml` } },
};

export default async function Page() {
  const items = await getLatestWire(80);
  return (
    <Layout>
      <AutoRefresh seconds={60} />
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden /> Live crime wire
            </p>
            <h1 className="font-serif text-3xl font-bold md:text-4xl">Latest Ghana crime news</h1>
            <p className="mt-2 font-body text-sm text-muted-foreground">Every new story, newest first. This page refreshes itself every minute. Everyone charged is presumed innocent unless a court finds otherwise.</p>
          </div>
          <div className="flex gap-3 font-sans text-sm">
            <Link href="/latest/rss.xml" className="underline underline-offset-2">RSS</Link>
            <Link href="/tips" className="font-semibold text-primary underline underline-offset-2">Send us a tip</Link>
          </div>
        </div>
        <WireList items={items} />
      </div>
    </Layout>
  );
}
