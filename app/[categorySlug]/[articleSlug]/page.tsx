import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import ArticleView from '@/components/ArticleView';
import { JsonLd } from '@/components/JsonLd';
import { getArticle, findSlugRedirect } from '@/lib/server-data';
import { getCategoryLabel, isValidCategory } from '@/lib/categories';
import { isSelfHostedImage } from '@/lib/article-image';

export const revalidate = 300;

type Params = Promise<{ categorySlug: string; articleSlug: string }>;

function socialImageFor(hero: string | null | undefined) {
  return isSelfHostedImage(hero) && hero?.startsWith('http')
    ? `${BASE_URL}/api/og-image?url=${encodeURIComponent(hero)}`
    : `${BASE_URL}/og-image.png`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug, articleSlug } = await params;
  const article = await getArticle(categorySlug, articleSlug);
  if (!article) return { title: 'Page not found', robots: { index: false } };

  const title = article.seo_title || article.title;
  const description = article.seo_description || article.summary || '';
  const socialImage = socialImageFor(article.hero_image);
  const canonical = `${BASE_URL}/${categorySlug}/${articleSlug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at ?? undefined,
      authors: [article.author_name || 'GhanaCrimes Data Desk'],
      images: [{ url: socialImage }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { categorySlug, articleSlug } = await params;
  if (!isValidCategory(categorySlug)) notFound();

  const article = await getArticle(categorySlug, articleSlug);
  if (!article) {
    const target = await findSlugRedirect(categorySlug, articleSlug);
    if (target) permanentRedirect(target);
    notFound();
  }

  const canonical = `${BASE_URL}/${categorySlug}/${articleSlug}`;
  const title = article.seo_title || article.title;
  const authorName = article.author_name || 'GhanaCrimes Data Desk';

  return (
    <Layout>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: title.slice(0, 110),
            description: article.seo_description || article.summary,
            image: [socialImageFor(article.hero_image)],
            datePublished: article.published_at,
            dateModified: article.updated_at || article.published_at,
            author: { '@type': 'Organization', name: authorName, url: `${BASE_URL}/about` },
            publisher: {
              '@type': 'Organization',
              name: 'GhanaCrimes',
              logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.png` },
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
            ...(article.source_url ? { isBasedOn: article.source_url } : {}),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
              {
                '@type': 'ListItem',
                position: 2,
                name: getCategoryLabel(categorySlug),
                item: `${BASE_URL}/${categorySlug}`,
              },
              { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
            ],
          },
        ]}
      />
      <ArticleView categorySlug={categorySlug} articleSlug={articleSlug} initialArticle={article} />
    </Layout>
  );
}
