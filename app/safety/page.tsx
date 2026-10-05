import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { EditorialPage } from '@/components/EditorialPage';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Safety guide',
  description: 'Practical Ghana-focused safety guidance: robbery awareness, scam red flags, road crash reporting and how to contact the police.',
  alternates: { canonical: `${BASE_URL}/safety` },
};

export default function SafetyPage() {
  return (
    <Layout>
      <EditorialPage
        kicker="Safety"
        title="Staying safe: a practical guide"
        summary="Calm, practical steps for everyday situations in Ghana. Most days pass without incident; these habits help when they do not."
        updated="2026-10-05"
        disclaimer="General guidance only. In an emergency, contact the Ghana Police Service on 191 or the toll-free line 18555."
        sections={[
          {
            heading: 'Contacting the police',
            paragraphs: [
              'The Ghana Police Service emergency number is 191. The Service also operates the toll-free line 18555. You can also report at your nearest police station.',
              'When you call, give your location first, then what happened and whether anyone is hurt.',
            ],
          },
          {
            heading: 'Robbery awareness',
            paragraphs: [
              'Keep phones and cash out of sight in traffic and at ATMs, and use ATMs in well-lit, busy places where possible.',
              'If you are confronted by an armed person, your safety matters more than property. Do not resist; note what you can and report to the police as soon as it is safe.',
            ],
          },
          {
            heading: 'Cyber fraud and romance scam red flags',
            paragraphs: [
              'Be wary of anyone who asks for mobile money, PINs or one-time codes, or who pressures you to act immediately.',
              'Never share your mobile money PIN or verification codes, including with people claiming to be from your network or bank.',
              'Read our guide on how to spot a romance scam, and check suspicious accounts on Fraud Watch.',
            ],
          },
          {
            heading: 'Reporting a road crash',
            paragraphs: [
              'Move to safety if you can and call 191 for police, or the National Ambulance Service on 112 or 193 if anyone is injured.',
              'Do not move seriously injured people unless they are in immediate danger. Note vehicle numbers and the location for the police report.',
            ],
          },
        ]}
        sources={[
          { label: 'Ghana Police Service', href: 'https://police.gov.gh' },
          { label: 'Cyber Security Authority', href: 'https://www.csa.gov.gh' },
        ]}
        related={[
          { label: 'How to spot a romance scam', href: '/explainers/how-to-spot-a-romance-scam-in-ghana' },
          { label: 'Fraud Watch', href: '/fraud-watch' },
          { label: 'Armed robbery topic', href: '/topics/armed-robbery' },
          { label: 'Road crashes topic', href: '/topics/road-crashes' },
        ]}
      />
    </Layout>
  );
}
