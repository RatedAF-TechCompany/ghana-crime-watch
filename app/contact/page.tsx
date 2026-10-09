import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { SubmissionForm } from '@/components/SubmissionForm';
import { BASE_URL } from '@/lib/utils';
import { getMasthead } from '@/lib/masthead';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Contact GhanaCrimes',
  description: 'Get in touch with the GhanaCrimes newsroom.',
  alternates: { canonical: `${BASE_URL}/contact` },
};

export default async function ContactPage() {
  const masthead = await getMasthead();
  return (
    <Layout>
      <StaticPage title="Contact us" intro="Send a message to the GhanaCrimes newsroom. For story tips, use our tips page; to report an error, use our corrections page.">
        <p>
          <Link href="/tips">Send a tip</Link> · <Link href="/corrections">Request a correction</Link>
        </p>
        {(masthead.contactEmail || masthead.address) && <address className="not-italic">
          {masthead.contactEmail && <p><strong>Newsroom email:</strong> <a href={`mailto:${masthead.contactEmail}`}>{masthead.contactEmail}</a></p>}
          {masthead.address && <p><strong>Address:</strong> {masthead.address}</p>}
        </address>}
        <Suspense>
          <SubmissionForm
            table="contact_messages"
            submitLabel="Send message"
            successText="Thank you. Your message has been sent to the newsroom."
            fields={[
              { name: 'name', label: 'Your name', required: true, max: 120 },
              { name: 'email', label: 'Email', type: 'email', required: true, max: 255 },
              { name: 'subject', label: 'Subject', max: 200 },
              { name: 'message', label: 'Message', type: 'textarea', required: true, min: 10, max: 5000 },
            ]}
          />
        </Suspense>
      </StaticPage>
    </Layout>
  );
}
