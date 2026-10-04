import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The terms that apply when you use GhanaCrimes.',
  alternates: { canonical: `${BASE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <Layout>
      <StaticPage title="Terms of Use" intro="By using GhanaCrimes you agree to these terms.">
        <h2>Our content</h2>
        <p>Articles on GhanaCrimes are provided for general information. We work to keep them accurate, but reports about ongoing cases can change as new facts emerge. People accused of crimes are presumed innocent unless convicted by a court.</p>
        <h2>Using our content</h2>
        <p>You may share links to our articles. Please do not copy full articles or present them as your own without permission.</p>
        <h2>Comments and submissions</h2>
        <ul>
          <li>Do not post anything unlawful, defamatory, threatening or abusive.</li>
          <li>Do not identify victims of sexual offences or children involved in criminal matters.</li>
          <li>We may edit, decline or remove comments and submissions at our discretion.</li>
        </ul>
        <h2>Fraud Watch</h2>
        <p>Fraud Watch entries are reports from members of the public and are reviewed before being shown. A listing is not a finding of guilt. If you believe an entry about you is wrong, please <Link href="/contact">contact us</Link>.</p>
        <h2>Links to other sites</h2>
        <p>We link to original sources and other websites. We are not responsible for their content.</p>
        <h2>Changes</h2>
        <p>We may update these terms from time to time. The latest version will always be on this page.</p>
      </StaticPage>
    </Layout>
  );
}
