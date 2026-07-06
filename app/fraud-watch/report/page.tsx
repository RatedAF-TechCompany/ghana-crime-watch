import type { Metadata } from 'next';
import FraudWatchReportView from '@/components/FraudWatchReportView';

export const metadata: Metadata = {
  title: 'Report a Suspicious Account — Fraud Watch',
  description: 'Submit a report about a suspicious online seller account in Ghana.',
  alternates: { canonical: 'https://ghanacrimes.com/fraud-watch/report' },
};

export default function FraudWatchReportPage() {
  return <FraudWatchReportView />;
}
