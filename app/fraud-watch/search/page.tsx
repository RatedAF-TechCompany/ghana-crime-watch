import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BASE_URL } from '@/lib/utils';
import FraudWatchSearchView from '@/components/FraudWatchSearchView';

export const metadata: Metadata = {
  title: 'Search Suspicious Accounts — Fraud Watch',
  description: 'Search the GhanaCrimes Fraud Watch database of suspicious online seller accounts.',
  alternates: { canonical: `${BASE_URL}/fraud-watch/search` },
};

export default function FraudWatchSearchPage() {
  return (
    <Suspense fallback={<div className="container py-8">Loading search...</div>}>
      <FraudWatchSearchView />
    </Suspense>
  );
}
