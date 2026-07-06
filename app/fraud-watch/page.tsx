import type { Metadata } from 'next';
import FraudWatchHomeView from '@/components/FraudWatchHomeView';

export const metadata: Metadata = {
  title: 'Fraud Watch — Report Suspicious Online Sellers in Ghana',
  description:
    'Check and report suspicious online seller accounts in Ghana. Community-powered scam database to protect Ghanaians from online fraud.',
  alternates: { canonical: 'https://ghanacrimes.com/fraud-watch' },
  openGraph: {
    title: 'Fraud Watch — Report Suspicious Online Sellers in Ghana',
    description: 'Community-powered scam database for Ghana.',
    url: 'https://ghanacrimes.com/fraud-watch',
    type: 'website',
  },
};

export default function FraudWatchPage() {
  return <FraudWatchHomeView />;
}
