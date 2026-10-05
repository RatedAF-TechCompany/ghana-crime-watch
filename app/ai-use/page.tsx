import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'How GhanaCrimes uses AI',
  description: 'How GhanaCrimes uses automated tools to find and summarise published crime reports, and the checks every story must pass.',
  alternates: { canonical: `${BASE_URL}/ai-use` },
};

export default function AiUsePage() {
  return (
    <Layout>
      <StaticPage title="How we use AI" intro="We use automated tools to help us cover more of Ghana's crime news. This page explains what they do and what they never do.">
        <h2>What the tools do</h2>
        <ul>
          <li>Check news feeds from Ghanaian publishers and official bodies every few minutes for crime, police and court reports.</li>
          <li>Write a short original summary of a published report, using only facts stated in that report.</li>
          <li>Run automatic checks before anything appears on the site (see below).</li>
          <li>When another outlet reports a story we already have, add a dated update and a link to that outlet instead of creating a second article.</li>
        </ul>
        <h2>The checks every story must pass</h2>
        <ul>
          <li>It must be about crime, policing or the courts in Ghana.</li>
          <li>Every name, number, date and place must appear in the source report.</li>
          <li>People who are accused are described as suspected, arrested or charged until a court rules.</li>
          <li>Stories that would identify a victim of a sexual offence or a child under 18 are blocked.</li>
          <li>Graphic descriptions, home addresses and phone numbers are blocked.</li>
        </ul>
        <h2>Publishing and human review</h2>
        <p>Some stories are published automatically, but only when every check passes and the report comes from an official body or is confirmed by at least two independent outlets. Everything else goes to an editor for review before it can be published. Stories found only through news search tools are never published on their own.</p>
        <h2>What the tools never do</h2>
        <ul>
          <li>We do not use AI to create or alter images. Article photos come only from the original source; otherwise no photo is shown.</li>
          <li>We do not add facts, quotes or context that are not in the source report.</li>
        </ul>
        <h2>Sources and corrections</h2>
        <p>Every new article names its source and links to the original report. If we get something wrong, tell us through our <Link href="/corrections">Corrections</Link> page. Our standards are set out in our <Link href="/editorial-policy">Editorial Policy</Link>.</p>
      </StaticPage>
    </Layout>
  );
}
