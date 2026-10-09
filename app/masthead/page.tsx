import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';
import { getMasthead, MastheadList } from '@/lib/masthead';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const masthead = await getMasthead();
  return { title: 'Masthead and ownership', description: 'Publisher, ownership and newsroom details for GhanaCrimes.', alternates: { canonical: `${BASE_URL}/masthead` }, ...(masthead.hasAny ? {} : { robots: { index: false, follow: true } }) };
}

export default async function MastheadPage() {
  const masthead = await getMasthead();
  return <Layout><StaticPage title="Masthead and ownership" intro="Publisher, ownership and newsroom details for GhanaCrimes.">
    {masthead.hasAny ? <MastheadList masthead={masthead} /> : <p>Ownership and masthead details are being finalised and will be published here.</p>}
    <p><Link href="/editorial-policy">Editorial Policy</Link> · <Link href="/corrections">Corrections</Link> · <Link href="/ai-use">How we use AI</Link> · <Link href="/contact">Contact</Link></p>
  </StaticPage></Layout>;
}