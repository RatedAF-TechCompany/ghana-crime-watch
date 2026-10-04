import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { SubmissionForm } from '@/components/SubmissionForm';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Send a Tip',
  description: 'Share information with the GhanaCrimes newsroom securely. You can stay anonymous.',
  alternates: { canonical: `${BASE_URL}/tips` },
};

export default function TipsPage() {
  return (
    <Layout>
      <StaticPage title="Send us a tip" intro="Know something we should look into? Tell us. You do not have to give your name.">
        <ul>
          <li>Your tip is sent over an encrypted connection and can only be read by authorised newsroom staff.</li>
          <li>Leaving contact details is optional. If you leave them, we may contact you to verify the information.</li>
          <li>We never reveal the identity of a source who shares information in confidence.</li>
          <li>We verify tips before reporting on them. Sending a tip does not guarantee a story.</li>
          <li>If someone is in immediate danger, contact the Ghana Police Service first.</li>
        </ul>
        <Suspense>
          <SubmissionForm
            table="tips"
            submitLabel="Send tip"
            successText="Thank you. Your tip has been received by the newsroom."
            fields={[
              { name: 'tip_text', label: 'What do you want to tell us?', type: 'textarea', required: true, min: 20, max: 10000 },
              { name: 'location', label: 'Where did this happen?', max: 200 },
              { name: 'contact', label: 'How can we reach you?', max: 255, placeholder: 'Email or phone, only if you want us to contact you' },
            ]}
          />
        </Suspense>
      </StaticPage>
    </Layout>
  );
}
