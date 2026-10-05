import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { EditorialPage } from '@/components/EditorialPage';
import { NewsletterSignup } from '@/components/NewsletterSignup';
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
        summary="We are preparing regional and topic digests by email, WhatsApp and Telegram. They are not live yet."
        sections={[
          {
            heading: 'What you can do now',
            paragraphs: [
              'Our existing daily email newsletter is already running. Sign up below to receive it; we will let subscribers know when the new alerts launch.',
              'We store only your email address for the newsletter, and you can unsubscribe at any time.',
            ],
          },
        ]}
        related={[{ label: 'Privacy policy', href: '/privacy' }, { label: 'RSS feed', href: '/rss.xml' }]}
      >
        <div className="mt-8"><NewsletterSignup /></div>
      </EditorialPage>
    </Layout>
  );
}
