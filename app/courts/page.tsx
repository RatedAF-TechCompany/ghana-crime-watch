import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { HubPage } from '@/components/HubPage';
import { getTopicArticles } from '@/lib/hubs';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Courts: recent court coverage in Ghana',
  description: 'Recent GhanaCrimes coverage of criminal court hearings, remands, judgments and sentences in Ghana.',
  alternates: { canonical: `${BASE_URL}/courts` },
};

export default async function CourtsPage() {
  const articles = await getTopicArticles('court-cases', 30);
  return (
    <Layout>
      <HubPage
        kicker="Courts"
        title="Court coverage"
        intro="Our latest reports on criminal court hearings, remands, judgments and sentences across Ghana, newest first."
        note="This is news coverage published on GhanaCrimes, not an official court calendar. For official cause lists and court information, see the Judicial Service of Ghana at judicial.gov.gh. People charged are presumed innocent until proven guilty."
        articles={articles}
        related={[
          { label: 'Judicial Service of Ghana', href: 'https://judicial.gov.gh' },
          { label: 'Court cases topic', href: '/topics/court-cases' },
          { label: 'How police bail works', href: '/explainers/how-police-bail-works-in-ghana' },
        ]}
      />
      {articles.length === 0 && (
        <p className="container mx-auto max-w-6xl px-4 pb-10 font-sans text-sm text-muted-foreground">No court stories have been published yet.</p>
      )}
    </Layout>
  );
}
