import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { HubPage } from '@/components/HubPage';
import { BASE_URL } from '@/lib/utils';
import { TOPICS, getTopic, getTopicArticles } from '@/lib/hubs';

export const revalidate = 600;
type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = getTopic((await params).slug);
  if (!t) return { title: 'Page not found', robots: { index: false } };
  return { title: `${t.label} in Ghana`, description: t.intro, alternates: { canonical: `${BASE_URL}/topics/${t.slug}` } };
}

export default async function TopicPage({ params }: { params: Params }) {
  const t = getTopic((await params).slug);
  if (!t) notFound();
  // Never 404 a valid topic: a failed or empty fetch must not be cached as a missing page.
  const articles = await getTopicArticles(t.slug).catch(() => []);
  return (
    <Layout>
      <HubPage kicker="Topic" title={`${t.label} in Ghana`} intro={t.intro} articles={articles}
        related={TOPICS.filter((x) => x.slug !== t.slug).map((x) => ({ label: x.label, href: `/topics/${x.slug}` }))} />
      {articles.length === 0 && (
        <p className="container mx-auto max-w-6xl px-4 pb-10 font-sans text-sm text-muted-foreground">No stories on this topic are available right now.</p>
      )}
    </Layout>
  );
}
