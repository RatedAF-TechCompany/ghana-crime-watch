import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import { ArchiveMonth } from '@/components/ArchiveView';
import {
  accraToday,
  archiveMonthPath,
  daysInMonthCounts,
  formatArchiveMonth,
  getArchiveCalendar,
  parseArchiveMonth,
  storyCountLabel,
} from '@/lib/archive';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 300;

type Params = Promise<{ year: string; month: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year, month } = await params;
  const { y, m } = parseArchiveMonth(year, month);
  const label = formatArchiveMonth(y, m);
  const days = daysInMonthCounts(await getArchiveCalendar(), y, m);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const title = `GhanaCrimes news archive: ${label}`;
  const description = total
    ? `${storyCountLabel(total)} in the GhanaCrimes news archive for ${label}. Open a date to read the stories published that day.`
    : `No GhanaCrimes stories were published in ${label}. Browse the news archive for other months.`;
  const canonical = `${BASE_URL}${archiveMonthPath(y, m)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    ...(total ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'GhanaCrimes' },
    twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description },
  };
}

export default async function ArchiveMonthPage({ params }: { params: Params }) {
  const { year, month } = await params;
  const { y, m } = parseArchiveMonth(year, month);
  const label = formatArchiveMonth(y, m);
  const calendar = await getArchiveCalendar();
  const days = daysInMonthCounts(calendar, y, m);
  const firstKey = calendar.length ? calendar[calendar.length - 1].date : accraToday().key;
  const canonical = `${BASE_URL}${archiveMonthPath(y, m)}`;
  return (
    <Layout>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Archive', item: `${BASE_URL}/archive` },
            { '@type': 'ListItem', position: 3, name: label, item: canonical },
          ],
        }}
      />
      <ArchiveMonth y={y} m={m} days={days} todayKey={accraToday().key} firstKey={firstKey} />
    </Layout>
  );
}
