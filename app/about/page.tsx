import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';

export const revalidate = 600;

const MASTHEAD_FIELDS: [string, string][] = [
  ['publisher', 'Publisher'], ['owner', 'Owned by'], ['editor', 'Editor'], ['location', 'Based in'], ['registration', 'Registration'], ['contact', 'Newsroom contact'],
];

export const metadata: Metadata = {
  title: 'About GhanaCrimes',
  description: 'GhanaCrimes provides factual, verified crime reporting for Ghana, with clear sourcing and a public corrections process.',
  alternates: { canonical: `${BASE_URL}/about` },
};

export default async function AboutPage() {
  // Masthead facts come only from site settings entered by the publisher; nothing is shown that has not been supplied.
  const { data } = await createServerClient().from('site_settings').select('value').eq('key', 'masthead').maybeSingle();
  const masthead = (data?.value ?? {}) as Record<string, string>;
  const rows = MASTHEAD_FIELDS.filter(([k]) => typeof masthead[k] === 'string' && masthead[k].trim());
  return (
    <Layout>
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
        {rows.length ? (
          <dl>
            {rows.map(([k, label]) => (
              <div key={k}><dt><strong>{label}</strong></dt><dd>{masthead[k]}</dd></div>
            ))}
          </dl>
        ) : (
          <p>GhanaCrimes is an independent online publication. Reports are published under the GhanaCrimes Newsroom byline.</p>
        )}
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
