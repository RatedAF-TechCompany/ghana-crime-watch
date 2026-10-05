import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { HubPage } from '@/components/HubPage';
import { BASE_URL } from '@/lib/utils';
import { REGIONS, getRegion, getRegionArticles } from '@/lib/hubs';

export const revalidate = 300;
type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = getRegion((await params).slug);
  if (!r) return { title: 'Page not found', robots: { index: false } };
  return {
    title: `Crime news from the ${r.name} Region`,
    description: `Latest crime and court reports from the ${r.name} Region of Ghana.`,
    alternates: { canonical: `${BASE_URL}/regions/${r.slug}` },
  };
}

export default async function RegionPage({ params }: { params: Params }) {
  const r = getRegion((await params).slug);
  if (!r) notFound();
  const articles = await getRegionArticles(r.name);
  if (!articles.length) notFound();
  return (
    <Layout>
      <HubPage kicker="Region" title={`${r.name} Region`}
        intro={`Latest crime, police and court reports from the ${r.name} Region (regional capital: ${r.capital}).`}
        note="Stories are placed in a region when their headline or summary names a town or district in it. Some stories name no place and are not shown here."
        articles={articles}
        related={[{ label: 'Crime map', href: '/map' }, ...REGIONS.filter((x) => x.slug !== r.slug).map((x) => ({ label: x.name, href: `/regions/${x.slug}` }))]} />
    </Layout>
  );
}
