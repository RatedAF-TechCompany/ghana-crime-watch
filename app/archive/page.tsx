import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import { ArchiveIndex } from '@/components/ArchiveView';
import { getArchiveCalendar, groupArchiveMonths } from '@/lib/archive';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 300;

const title = 'GhanaCrimes news archive';
const description = 'Browse the GhanaCrimes news archive by publication date. Every story, grouped by year and month in Ghana time (GMT).';
const canonical = `${BASE_URL}/archive`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, type: 'website', siteName: 'GhanaCrimes' },
  twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description },
};

export default async function ArchiveIndexPage() {
  const days = await getArchiveCalendar();
  const groups = groupArchiveMonths(days);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return (
    <Layout>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: canonical,
          isPartOf: { '@type': 'WebSite', name: 'GhanaCrimes', url: BASE_URL },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Archive', item: canonical },
          ],
        }}
      />
      <ArchiveIndex groups={groups} total={total} />
    </Layout>
  );
}
