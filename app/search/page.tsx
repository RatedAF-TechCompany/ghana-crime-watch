import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { createServerClient } from '@/lib/supabase/server';
import { getCategoryLabel } from '@/lib/categories';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

type SP = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q = '' } = await searchParams;
  const term = q.trim().slice(0, 100).replace(/[%_,()]/g, ' ');
  let results: { id: string; title: string; summary: string; category_slug: string; article_slug: string }[] = [];
  if (term.length >= 2) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('articles')
      .select('id, title, summary, category_slug, article_slug')
      .eq('is_published', true)
      .or(`title.ilike.%${term}%,summary.ilike.%${term}%`)
      .order('published_at', { ascending: false })
      .limit(30);
    results = data ?? [];
  }
  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 font-headline text-3xl font-bold">Search</h1>
        <form action="/search" method="get" className="mb-8 flex gap-2" role="search">
          <input name="q" type="search" defaultValue={q} placeholder="Search GhanaCrimes" className="h-11 flex-1 rounded-md border border-input bg-background px-3 font-sans text-sm" />
          <button type="submit" className="h-11 rounded-md bg-primary px-5 font-sans text-sm font-semibold text-primary-foreground">Search</button>
        </form>
        {term.length >= 2 && <p className="mb-4 font-sans text-sm text-muted-fg">{results.length} result{results.length === 1 ? '' : 's'}</p>}
        <ul>
          {results.map((a) => (
            <li key={a.id} className="border-b border-border py-4">
              <Link href={`/${a.category_slug}/${a.article_slug}`} className="group block">
                <p className="author-italic-red text-[13px]">{getCategoryLabel(a.category_slug)}</p>
                <span className="story-title text-[18px] group-hover:text-primary">{a.title}</span>
                <p className="mt-1 font-body text-sm text-muted-fg">{a.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
