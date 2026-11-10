import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import { ArchiveDay } from '@/components/ArchiveView';
import {
  archiveDayPath,
  archiveMonthPath,
  formatArchiveDay,
  formatArchiveMonth,
  getArchiveCalendar,
  getDayArticles,
  neighborPublishedDays,
  parseArchiveDay,
  storyCountLabel,
  ymdKey,
} from '@/lib/archive';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 300;

type Params = Promise<{ year: string; month: string; day: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year, month, day } = await params;
  const { y, m, d } = parseArchiveDay(year, month, day);
  const label = formatArchiveDay(y, m, d);
  const articles = await getDayArticles(y, m, d);
  const title = `GhanaCrimes news archive: ${label}`;
  const description = articles.length
    ? `${storyCountLabel(articles.length)} published on ${label}. Every GhanaCrimes story from that day, newest first.`
    : `No GhanaCrimes stories were published on ${label}. Browse the news archive for other dates.`;
  const canonical = `${BASE_URL}${archiveDayPath(y, m, d)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    ...(articles.length ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'GhanaCrimes' },
    twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description },
  };
}

export default async function ArchiveDayPage({ params }: { params: Params }) {
  const { year, month, day } = await params;
  const { y, m, d } = parseArchiveDay(year, month, day);
  const label = formatArchiveDay(y, m, d);
  const monthLabel = formatArchiveMonth(y, m);
  const [articles, calendar] = await Promise.all([getDayArticles(y, m, d), getArchiveCalendar()]);
  const { prev, next } = neighborPublishedDays(ymdKey(y, m, d), calendar);
  const canonical = `${BASE_URL}${archiveDayPath(y, m, d)}`;
  return (
    <Layout>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `GhanaCrimes news archive: ${label}`,
          url: canonical,
          datePublished: ymdKey(y, m, d),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: articles.length,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            itemListElement: articles.map((article, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: article.title,
              url: `${BASE_URL}/${article.category_slug}/${article.article_slug}`,
            })),
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Archive', item: `${BASE_URL}/archive` },
            { '@type': 'ListItem', position: 3, name: monthLabel, item: `${BASE_URL}${archiveMonthPath(y, m)}` },
            { '@type': 'ListItem', position: 4, name: label, item: canonical },
          ],
        }}
      />
      <ArchiveDay y={y} m={m} d={d} articles={articles} prev={prev} next={next} />
    </Layout>
  );
}
