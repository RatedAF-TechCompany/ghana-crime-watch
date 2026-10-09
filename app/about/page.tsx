import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';
import { JsonLd } from '@/components/JsonLd';
import { getMasthead, MastheadList, newsOrganizationJsonLd } from '@/lib/masthead';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'About GhanaCrimes',
  description: 'GhanaCrimes provides factual, verified crime reporting for Ghana, with clear sourcing and a public corrections process.',
  alternates: { canonical: `${BASE_URL}/about` },
};

export default async function AboutPage() {
  const masthead = await getMasthead();
  return (
    <Layout>
      <JsonLd data={newsOrganizationJsonLd(masthead)} />
      <StaticPage title="About GhanaCrimes" intro="Factual, verified crime reporting for Ghana.">
        <h2>Our mission</h2>
        <p>GhanaCrimes reports on crime, policing and the justice system in Ghana. Our aim is simple: publish accurate, sourced and fair reports that help the public understand what is happening in their communities, without sensationalism.</p>
        <h2>What we cover</h2>
        <ul>
          <li>Police reports and official statements</li>
          <li>Court proceedings and judgments</li>
          <li>Fraud, scams and cybercrime, including our community Fraud Watch tool</li>
          <li>Public safety and crime prevention information</li>
        </ul>
        <h2>How we work</h2>
        <p>Every report is based on an identifiable source, such as an official statement, a court record or an earlier published report, and each article links to that source. We treat everyone who is accused of a crime as innocent unless and until a court finds otherwise. Our full standards are set out in our <Link href="/editorial-policy">Editorial Policy</Link>.</p>
        <h2>Masthead and ownership</h2>
        {masthead.hasAny ? <MastheadList masthead={masthead} /> : (
          <p>Reports are published under the GhanaCrimes Newsroom byline. Full ownership and masthead details will be listed here.</p>
        )}
        <p><Link href="/masthead">View the full masthead and ownership page</Link>.</p>
        <h2>Use of AI</h2>
        <p>We use automated tools to find and summarise published reports, with strict checks and editor review. Read <Link href="/ai-use">how we use AI</Link>.</p>
        <h2>Corrections</h2>
        <p>If we get something wrong, we fix it and say so. See our <Link href="/corrections">Corrections</Link> page to report an error.</p>
        <h2>Contact</h2>
        <p>You can reach the newsroom through our <Link href="/contact">contact form</Link>, or share information with us through our <Link href="/tips">tips page</Link>.</p>
      </StaticPage>
    </Layout>
  );
}
