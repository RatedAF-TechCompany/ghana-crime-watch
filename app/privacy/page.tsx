import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How GhanaCrimes collects, uses and protects your information.',
  alternates: { canonical: `${BASE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <Layout>
      <StaticPage title="Privacy Policy" intro="How we handle information when you use GhanaCrimes.">
        <h2>Information you give us</h2>
        <p>When you use our contact, tips, corrections, comments, newsletter or Fraud Watch forms, we store the information you enter so that we can respond and review it. Tips can be sent without giving your name or contact details.</p>
        <h2>Information collected automatically</h2>
        <p>We use analytics tools to understand how the site is used, such as which pages are read. These tools may use cookies. We also count article views to show popular stories.</p>
        <h2>How we use information</h2>
        <ul>
          <li>To respond to messages, tips and correction requests</li>
          <li>To moderate comments and Fraud Watch reports</li>
          <li>To send newsletters you have signed up for</li>
          <li>To keep the site secure and improve it</li>
        </ul>
        <h2>Who can see it</h2>
        <p>Messages, tips and correction requests are only visible to authorised GhanaCrimes staff. Commenter email addresses are never published. We do not sell personal information.</p>
        <h2>Protecting sources</h2>
        <p>We do not reveal the identity of people who share information with us in confidence, unless required by law.</p>
        <h2>Your choices</h2>
        <p>You can unsubscribe from newsletters at any time, and you can ask us to delete information you have sent us by using our <Link href="/contact">contact form</Link>.</p>
      </StaticPage>
    </Layout>
  );
}
