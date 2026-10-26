import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/utils';
import AboutPage from '../about/page';

export const revalidate = 600;

// Real About page at the legacy /about-us URL (previously fell through to the section template).
export const metadata: Metadata = {
  title: 'About GhanaCrimes',
  description: 'About GhanaCrimes, published by Ghana Crimes Ltd, Accra, Ghana: factual, verified crime news for Ghana from the GhanaCrimes Newsroom. Contact ghanacrimes@gmail.com.',
  alternates: { canonical: `${BASE_URL}/about` },
};

export default AboutPage;
