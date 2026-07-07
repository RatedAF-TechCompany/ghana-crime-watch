import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import CategoryView from '@/components/CategoryView';
import { getCategoryLabel } from '@/lib/categories';

type Params = Promise<{ categorySlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug } = await params;
  const label = getCategoryLabel(categorySlug);
  const title = `${label} News`;
  const description = `Latest ${label.toLowerCase()} news and reports from Ghana. Stay informed with GhanaCrimes.`;
  const canonical = `${BASE_URL}/${categorySlug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'GhanaCrimes',
      images: [{ url: '/og-image.png' }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@GhanaCrimes',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { categorySlug } = await params;
  return (
    <Layout>
      <CategoryView categorySlug={categorySlug} />
    </Layout>
  );
}
