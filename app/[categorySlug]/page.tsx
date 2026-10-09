import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import CategoryView from '@/components/CategoryView';
import { JsonLd } from '@/components/JsonLd';
import { CATEGORY_INTROS, HIDDEN_CATEGORIES, categoryTitle, getCategoryLabel, isValidCategory } from '@/lib/categories';
import { getCategoryPage } from '@/lib/server-data';

export const revalidate = 120;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Params = Promise<{ categorySlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug } = await params;
  if (!isValidCategory(categorySlug)) return { title: 'Page not found', robots: { index: false } };
  const label = getCategoryLabel(categorySlug);
  const title = categoryTitle(categorySlug);
  const description = CATEGORY_INTROS[categorySlug] ?? `Latest ${label.toLowerCase()} news and reports from Ghana.`;
  const canonical = `${BASE_URL}/${categorySlug}`;
  const { articles } = await getCategoryPage(categorySlug, 1);

  return {
    title,
    description,
    alternates: { canonical },
    ...(!articles.length || HIDDEN_CATEGORIES.includes(categorySlug as any) ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'GhanaCrimes', images: [{ url: '/og-image.png' }] },
    twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description, images: ['/og-image.png'] },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { categorySlug } = await params;
  if (!isValidCategory(categorySlug)) notFound();
  const result = await getCategoryPage(categorySlug, 1);
  const label = getCategoryLabel(categorySlug);
  const intro = CATEGORY_INTROS[categorySlug] ?? `Latest ${label.toLowerCase()} news and reports from Ghana.`;

  return (
    <Layout>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: getCategoryLabel(categorySlug), item: `${BASE_URL}/${categorySlug}` },
          ],
        }}
      />
      <header className="mb-10 border-b border-border pb-5"><h1 className="font-headline text-3xl font-bold text-foreground md:text-4xl">{label}</h1><p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">{intro}</p></header>
      <CategoryView categorySlug={categorySlug} articles={result.articles} page={1} hasNext={result.hasNext} />
    </Layout>
  );
}
