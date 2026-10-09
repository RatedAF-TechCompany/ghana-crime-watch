import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { NoticesPage } from '@/components/NoticesPage';
import { getNotices } from '@/lib/notices';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
  const notices = await getNotices('wanted');
  return { title: 'Wanted: official notices', description: 'Wanted persons listed only from official Ghana Police Service and INTERPOL public notices.', alternates: { canonical: `${BASE_URL}/wanted` }, ...(notices.length ? {} : { robots: { index: false, follow: true } }) };
}

export default async function WantedPage() {
  const notices = await getNotices('wanted');
  return (
    <Layout>
      <NoticesPage
        kicker="Official notices"
        title="Wanted"
        intro="People sought by the Ghana Police Service or INTERPOL, listed only from their own public notices, each with a link to the original."
        notices={notices}
        officialLinks={[
          { label: 'Ghana Police Service', href: 'https://police.gov.gh' },
          { label: 'INTERPOL Red Notices', href: 'https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices' },
        ]}
      />
    </Layout>
  );
}
