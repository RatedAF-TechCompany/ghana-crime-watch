import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import HomeView from '@/components/HomeView';
import { JsonLd } from '@/components/JsonLd';
import { getHomeArticles } from '@/lib/server-data';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'GhanaCrimes - Ghana Crime News & Reports',
  description:
    'Factual, verified crime news for Ghana: police reports, court cases, fraud and cybercrime, with clear sourcing and corrections.',
  alternates: { canonical: `${BASE_URL}/` },
  openGraph: {
    title: 'GhanaCrimes - Ghana Crime News & Reports',
    description: 'Factual, verified crime news for Ghana.',
    url: `${BASE_URL}/`,
    type: 'website',
    siteName: 'GhanaCrimes',
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@GhanaCrimes',
    title: 'GhanaCrimes - Ghana Crime News & Reports',
    description: 'Factual, verified crime news for Ghana.',
    images: ['/og-image.png'],
  },
};

export default async function Page() {
  const initialArticles = await getHomeArticles();
  return (
    <Layout>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsMediaOrganization',
            name: 'GhanaCrimes',
            url: `${BASE_URL}/`,
            logo: `${BASE_URL}/favicon.png`,
            publishingPrinciples: `${BASE_URL}/editorial-policy`,
            correctionsPolicy: `${BASE_URL}/corrections`,
            ethicsPolicy: `${BASE_URL}/editorial-policy`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'GhanaCrimes',
            url: `${BASE_URL}/`,
          },
        ]}
      />
      <HomeView initialArticles={initialArticles} />
    </Layout>
  );
}
