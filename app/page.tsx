import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import HomeView from '@/components/HomeView';
import { DevelopingNow } from '@/components/DevelopingNow';
import { FollowRegion } from '@/components/FollowRegion';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { JsonLd } from '@/components/JsonLd';
import { getHomeArticles } from '@/lib/server-data';
import { getMasthead, newsOrganizationJsonLd } from '@/lib/masthead';

export const revalidate = 300;

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
  const masthead = await getMasthead();
  return (
    <Layout>
      <JsonLd
        data={[
          newsOrganizationJsonLd(masthead),
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            name: 'GhanaCrimes',
            inLanguage: 'en-GH',
            publisher: { '@id': `${BASE_URL}/#organization` },
            url: `${BASE_URL}/`,
          },
        ]}
      />
      <DevelopingNow />
      <FollowRegion />
      <HomeView initialArticles={initialArticles} />
      <div className="mx-auto mt-14 max-w-2xl">
        <NewsletterSignup />
      </div>
    </Layout>
  );
}
