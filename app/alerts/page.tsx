import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { EditorialPage } from '@/components/EditorialPage';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Crime alerts',
  description: 'Email, WhatsApp and Telegram crime digests from GhanaCrimes are coming.',
  alternates: { canonical: `${BASE_URL}/alerts` },
};

export default function AlertsPage() {
  return (
    <Layout>
      <EditorialPage
        kicker="Alerts"
        title="Crime alerts are coming"
        summary="We are preparing regional and topic digests by email, WhatsApp and Telegram. They are not live yet, so subscriptions are not open."
        sections={[
          {
            heading: 'What you can do now',
            paragraphs: [
              'This page will be updated when the alert service is available.',
              'No email, WhatsApp or Telegram alerts are being sent from this page.',
            ],
          },
        ]}
        related={[{ label: 'Privacy policy', href: '/privacy' }, { label: 'RSS feed', href: '/rss.xml' }]}
      />
    </Layout>
  );
}
