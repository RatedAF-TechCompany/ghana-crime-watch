import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import ArticleView from '@/components/ArticleView';
import { createServerClient } from '@/lib/supabase/server';

type Params = Promise<{ categorySlug: string; articleSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug, articleSlug } = await params;
  const supabase = createServerClient();
  const { data: article } = await supabase
    .from('articles')
    .select('title, seo_title, seo_description, summary, hero_image, published_at, author_name')
    .eq('category_slug', categorySlug)
    .eq('article_slug', articleSlug)
    .eq('is_published', true)
    .maybeSingle();

  if (!article) {
    return { title: 'Article Not Found' };
  }

  const title = article.seo_title || article.title;
  const description = article.seo_description || article.summary || '';
  // Hero images are hosted on Supabase Storage, which serves `X-Robots-Tag: none`.
  // Meta/WhatsApp crawlers refuse to use those images in link previews, so we
  // use the site's fallback OG image for social metadata instead.
  const socialImage = `${BASE_URL}/og-image.png`;
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
      authors: [article.author_name || 'GhanaCrimes Newsroom'],
      images: [{ url: socialImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage],
    },
    other: {
      'script:ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: title,
        description,
        image: socialImage,
        datePublished: article.published_at,
        author: {
          '@type': 'Person',
          name: article.author_name || 'GhanaCrimes Newsroom',
        },
        publisher: {
          '@type': 'Organization',
          name: 'GhanaCrimes',
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.png` },
        },
        mainEntityOfPage: canonical,
      }),
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { categorySlug, articleSlug } = await params;
  return (
    <Layout>
      <ArticleView categorySlug={categorySlug} articleSlug={articleSlug} />
    </Layout>
  );
}
