import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import CategoryView from '@/components/CategoryView';
import { BASE_URL } from '@/lib/utils';
import { CATEGORY_INTROS, HIDDEN_CATEGORIES, categoryTitle, getCategoryLabel, isValidCategory } from '@/lib/categories';
import { getCategoryPage } from '@/lib/server-data';

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }
type Params = Promise<{ categorySlug: string; n: string }>;

function pageNumber(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= 1 && number <= 200 ? number : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug, n } = await params;
  const page = pageNumber(n);
  if (!isValidCategory(categorySlug) || !page || page === 1) return { title: 'Page not found', robots: { index: false } };
  const result = await getCategoryPage(categorySlug, page);
  if (!result.articles.length) return { title: 'Page not found', robots: { index: false } };
  const intro = CATEGORY_INTROS[categorySlug] ?? `Latest ${getCategoryLabel(categorySlug).toLowerCase()} news and reports from Ghana.`;
  const title = `${categoryTitle(categorySlug)} – page ${page}`;
  const description = `${intro} Page ${page}.`;
  const canonical = `${BASE_URL}/${categorySlug}/page/${page}`;
  return { title, description, alternates: { canonical }, ...(HIDDEN_CATEGORIES.includes(categorySlug as any) ? { robots: { index: false, follow: true } } : {}), openGraph: { title, description, url: canonical, type: 'website', siteName: 'GhanaCrimes', images: [{ url: '/og-image.png' }] }, twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description, images: ['/og-image.png'] } };
}

export default async function CategoryPagedPage({ params }: { params: Params }) {
  const { categorySlug, n } = await params;
  if (!isValidCategory(categorySlug)) notFound();
  const page = pageNumber(n);
  if (!page) notFound();
  if (page === 1) permanentRedirect(`/${categorySlug}`);
  const result = await getCategoryPage(categorySlug, page);
  if (!result.articles.length) notFound();
  const label = getCategoryLabel(categorySlug);
  const intro = CATEGORY_INTROS[categorySlug] ?? `Latest ${label.toLowerCase()} news and reports from Ghana.`;
  const canonical = `${BASE_URL}/${categorySlug}/page/${page}`;
  return <Layout>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL }, { '@type': 'ListItem', position: 2, name: label, item: `${BASE_URL}/${categorySlug}` }, { '@type': 'ListItem', position: 3, name: `Page ${page}`, item: canonical }] }} />
    <header className="mb-10 border-b border-border pb-5"><h1 className="font-headline text-3xl font-bold text-foreground md:text-4xl">{label} – page {page}</h1><p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">{intro}</p></header>
    <CategoryView categorySlug={categorySlug} articles={result.articles} page={page} hasNext={result.hasNext} />
  </Layout>;
}