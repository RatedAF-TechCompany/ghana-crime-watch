import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { HubPage } from '@/components/HubPage';
import { BASE_URL } from '@/lib/utils';
import { OG_HEIGHT, OG_WIDTH, hubSocialImage } from '@/lib/article-meta';
import { TOPICS, getTopic, getTopicArticles } from '@/lib/hubs';

export const revalidate = 600;
type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = getTopic((await params).slug);
  if (!t) return { title: 'Page not found', robots: { index: false } };
  const articles = await getTopicArticles(t.slug);
  const image = { url: hubSocialImage(`topic-${t.slug}`), width: OG_WIDTH, height: OG_HEIGHT };
  const title = `${t.label} in Ghana`;
  return {
    title, description: t.intro, alternates: { canonical: `${BASE_URL}/topics/${t.slug}` },
    ...(articles.length ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description: t.intro, url: `${BASE_URL}/topics/${t.slug}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description: t.intro, images: [image] },
  };
}

export default async function TopicPage({ params }: { params: Params }) {
  const t = getTopic((await params).slug);
  if (!t) notFound();
  const articles = await getTopicArticles(t.slug);
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
