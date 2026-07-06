import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import AboutView from '@/components/AboutView';

export const metadata: Metadata = {
  title: 'About Us & Editorial Policy',
  description:
    'GhanaCrimes is Ghana\'s leading crime news platform. Learn about our mission, editorial standards, photo-first image policy, and commitment to factual, responsible journalism.',
  alternates: { canonical: 'https://ghanacrimes.com/about' },
};

export default function AboutPage() {
  return (
    <Layout>
      <AboutView />
    </Layout>
  );
}
