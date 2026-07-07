import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/utils';
import FraudWatchReportView from '@/components/FraudWatchReportView';

export const metadata: Metadata = {
  title: 'Report a Suspicious Account — Fraud Watch',
  description: 'Submit a report about a suspicious online seller account in Ghana.',
  alternates: { canonical: `${BASE_URL}/fraud-watch/report` },
};

export default function FraudWatchReportPage() {
  return <FraudWatchReportView />;
}
