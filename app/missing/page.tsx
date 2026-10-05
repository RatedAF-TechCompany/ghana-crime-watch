import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { NoticesPage } from '@/components/NoticesPage';
import { getNotices } from '@/lib/notices';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Missing persons: official notices',
  description: 'Missing persons listed only from official Ghana Police Service and INTERPOL public notices.',
  alternates: { canonical: `${BASE_URL}/missing` },
};

export default async function MissingPage() {
  const notices = await getNotices('missing');
  return (
    <Layout>
      <NoticesPage
        kicker="Official notices"
        title="Missing persons"
        intro="Missing persons appeals from the Ghana Police Service or INTERPOL, listed only from their own public notices, each with a link to the original."
        emergencyNote="For an emergency or to report urgent information, call 191 or 18555. These are Ghana Police Service emergency numbers."
        notices={notices}
        officialLinks={[
          { label: 'Ghana Police Service', href: 'https://police.gov.gh' },
          { label: 'INTERPOL Yellow Notices', href: 'https://www.interpol.int/How-we-work/Notices/Yellow-Notices/View-Yellow-Notices' },
        ]}
      />
    </Layout>
  );
}
