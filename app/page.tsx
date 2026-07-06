import type { Metadata } from 'next';
import HomeView from '@/components/HomeView';

export const metadata: Metadata = {
  title: 'GhanaCrimes - Ghana Crime News & Reports',
  description:
    'Stay informed with the latest crime news, police reports, court cases, and crime statistics from Ghana. Comprehensive coverage of violent crime, fraud, cybercrime, and more.',
  alternates: { canonical: 'https://ghanacrimes.com' },
  openGraph: {
    title: 'GhanaCrimes - Ghana Crime News & Reports',
    description: 'Stay informed with the latest crime news from Ghana.',
    url: 'https://ghanacrimes.com',
    type: 'website',
  },
};

export default function Page() {
  return <HomeView />;
}
