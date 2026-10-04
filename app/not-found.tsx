import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { getLatestHeadlines } from '@/lib/server-data';
import { getCategoryLabel } from '@/lib/categories';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default async function NotFound() {
  const latest = await getLatestHeadlines(8);
  return (
    <Layout>
      <div className="mx-auto max-w-2xl py-6">
        <p className="author-italic-red mb-2">Error 404</p>
        <h1 className="mb-4 font-headline text-4xl font-bold">We could not find that page</h1>
        <p className="mb-6 font-body text-lg text-muted-fg">The link may be broken, or the page may have been moved or removed. Try searching, or read our latest stories below.</p>
        <form action="/search" method="get" className="mb-10 flex gap-2" role="search">
          <label htmlFor="nf-q" className="sr-only">Search GhanaCrimes</label>
          <input id="nf-q" name="q" type="search" placeholder="Search GhanaCrimes" className="h-11 flex-1 rounded-md border border-input bg-background px-3 font-sans text-sm" />
          <button type="submit" className="h-11 rounded-md bg-primary px-5 font-sans text-sm font-semibold text-primary-foreground">Search</button>
        </form>
        <h2 className="section-heading mb-3">Latest stories</h2>
        <ul>
          {latest.map((a) => (
            <li key={a.id} className="border-b border-border py-3">
              <Link href={`/${a.category_slug}/${a.article_slug}`} className="group block">
                <p className="author-italic-red text-[13px]">{getCategoryLabel(a.category_slug)}</p>
                <span className="story-title text-[17px] group-hover:text-primary">{a.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 font-sans text-sm"><Link href="/" className="text-primary underline">Go to the homepage</Link></p>
      </div>
    </Layout>
  );
}
