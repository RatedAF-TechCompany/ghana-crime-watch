import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import ArticleView from '@/components/ArticleView';
import { JsonLd } from '@/components/JsonLd';
import { getArticle, findSlugRedirect, getArticleContext, getArticleRouteState } from '@/lib/server-data';
import { getCategoryLabel, isValidCategory } from '@/lib/categories';
import { OG_HEIGHT, OG_WIDTH, articleModified, articleSocialImage, formatGhanaDate, regionForName, topicForText } from '@/lib/article-meta';

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Params = Promise<{ categorySlug: string; articleSlug: string }>;

function imageMeta(article: any) {
  const img = articleSocialImage(article);
  return img.generated ? { url: img.url, width: OG_WIDTH, height: OG_HEIGHT } : { url: img.url };
}

type LinkRow = { id: string; title: string; category_slug: string; article_slug: string; published_at: string | null };

function LinkList({ title, rows }: { title: string; rows: LinkRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="mt-10 border-t border-border pt-6">
      {title && <h2 className="mb-4 font-headline text-xl font-bold text-foreground">{title}</h2>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="border-b border-border pb-3 last:border-b-0">
            <a href={`/${r.category_slug}/${r.article_slug}`} className="story-title text-base leading-snug hover:text-primary">{r.title}</a>
            {r.published_at && <p className="mt-1 text-xs text-muted-foreground">{formatGhanaDate(r.published_at)}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categorySlug, articleSlug } = await params;
  const article = await getArticle(categorySlug, articleSlug);
  if (!article) {
    const rs = await getArticleRouteState(categorySlug, articleSlug);
    if (rs?.state === 'redirect' && rs.target) permanentRedirect(rs.target);
    if (rs?.state === 'gone') notFound();
    return { title: 'Page not found', robots: { index: false } };
  }

  const title = article.seo_title || article.title;
  const description = article.seo_description || article.summary || '';
  const socialImage = imageMeta(article);
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
      siteName: 'GhanaCrimes',
      publishedTime: article.published_at ?? undefined,
      modifiedTime: articleModified(article) ?? undefined,
      authors: [article.author_name || 'GhanaCrimes Data Desk'],
      images: [socialImage],
    },
    twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description, images: [socialImage] },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { categorySlug, articleSlug } = await params;
  if (!isValidCategory(categorySlug)) notFound();

  const article = await getArticle(categorySlug, articleSlug);
  if (!article) {
    const rs = await getArticleRouteState(categorySlug, articleSlug);
    if (rs?.state === 'redirect' && rs.target) permanentRedirect(rs.target);
    if (rs?.state === 'gone') notFound();
    const target = await findSlugRedirect(categorySlug, articleSlug);
    if (target) permanentRedirect(target);
    notFound();
  }

  const canonical = `${BASE_URL}/${categorySlug}/${articleSlug}`;
  const title = article.seo_title || article.title;
  const authorName = article.author_name || 'GhanaCrimes Data Desk';
  const topic = topicForText(`${article.title} ${article.summary ?? ''}`);
  const regionHub = regionForName(article.region);
  const ctx = await getArticleContext(article, topic?.terms ?? null);
  const img = imageMeta(article);

  return (
    <Layout>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: title.slice(0, 110),
            description: article.seo_description || article.summary,
            image: [{ '@type': 'ImageObject', ...img }],
            datePublished: article.published_at,
            dateModified: articleModified(article),
            author: { '@type': 'Organization', name: authorName, url: `${BASE_URL}/about` },
            publisher: {
              '@type': 'Organization',
              name: 'GhanaCrimes',
              logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.png` },
            },
            articleSection: getCategoryLabel(categorySlug),
            inLanguage: 'en-GH',
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
      <ArticleView categorySlug={categorySlug} articleSlug={articleSlug} initialArticle={article} thread={ctx.thread}>
        {ctx.thread && (
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="mb-3 font-headline text-xl font-bold text-foreground">Follow this story</h2>
            <p className="mb-3 text-sm"><a href={`/live/${ctx.thread.thread_slug}`} className="text-primary underline underline-offset-2">All updates: {ctx.thread.title}</a></p>
            <LinkList title="" rows={ctx.siblings} />
          </section>
        )}
        <LinkList title="Related" rows={ctx.related} />
        {(regionHub || topic) && (
          <nav aria-label="More coverage" className="mt-6 flex flex-wrap gap-4 font-sans text-sm">
            {regionHub && <a href={`/regions/${regionHub.slug}`} className="text-primary underline underline-offset-2">More from the {regionHub.name} Region</a>}
            {topic && <a href={`/topics/${topic.slug}`} className="text-primary underline underline-offset-2">More on {topic.label}</a>}
          </nav>
        )}
      </ArticleView>
    </Layout>
  );
}
