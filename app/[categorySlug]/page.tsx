import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import CategoryView from '@/components/CategoryView';
import { JsonLd } from '@/components/JsonLd';
import { getCategoryLabel, isValidCategory } from '@/lib/categories';
import { getCategoryArticles } from '@/lib/server-data';

export const revalidate = 120;

type Params = Promise<{ categorySlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug } = await params;
  if (!isValidCategory(categorySlug)) return { title: 'Page not found', robots: { index: false } };
  const label = getCategoryLabel(categorySlug);
  const title = `${label} News`;
  const description = `Latest ${label.toLowerCase()} news and reports from Ghana. Stay informed with GhanaCrimes.`;
  const canonical = `${BASE_URL}/${categorySlug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'GhanaCrimes', images: [{ url: '/og-image.png' }] },
    twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description, images: ['/og-image.png'] },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { categorySlug } = await params;
  if (!isValidCategory(categorySlug)) notFound();
  const initialArticles = await getCategoryArticles(categorySlug);

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
      <CategoryView categorySlug={categorySlug} initialArticles={initialArticles} />
    </Layout>
  );
}
