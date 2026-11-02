import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import ArticleView from '@/components/ArticleView';
import { JsonLd } from '@/components/JsonLd';
import { getArticle, findSlugRedirect, getArticleContext, getArticleRouteState, getStoryUpdates } from '@/lib/server-data';
import { getCategoryLabel, isValidCategory } from '@/lib/categories';
import { OG_HEIGHT, OG_WIDTH, articleModified, articleSocialImage, clipAtWord, articleTitleText, formatGhanaDate, regionForName, topicForText, metaDescription } from '@/lib/article-meta';
import { publisherRef, getMasthead } from '@/lib/masthead';
import { bylineAuthor, displayByline } from '@/lib/authors';
import { formatHearing, getCaseForArticle } from '@/lib/court-cases';

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Params = Promise<{ categorySlug: string; articleSlug: string }>;

function imageMeta(article: any) {
  const img = articleSocialImage(article);
  return img.generated ? { url: img.url, width: OG_WIDTH, height: OG_HEIGHT } : { url: img.url };
}

// Google recommends 16:9, 4:3 and 1:1 variants (>=1200px wide) for article rich results.
function jsonLdImages(article: any, img: { url: string; width?: number; height?: number }) {
  const card = articleSocialImage({ id: article.id }).url;
  const sep = card.includes('?') ? '&' : '?';
  const variants = [
    { '@type': 'ImageObject', url: `${card}${sep}ar=16x9`, width: 1200, height: 675 },
    { '@type': 'ImageObject', url: `${card}${sep}ar=4x3`, width: 1200, height: 900 },
    { '@type': 'ImageObject', url: `${card}${sep}ar=1x1`, width: 1200, height: 1200 },
  ];
  return articleSocialImage(article).generated ? variants : [{ '@type': 'ImageObject', ...img }, ...variants];
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

  const title = articleTitleText(article);
  const description = metaDescription(article.seo_description, article.summary);
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
      authors: [displayByline(article.author_name)],
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
  const title = articleTitleText(article);
  const authorName = displayByline(article.author_name);
  const masthead = await getMasthead();
  const author = bylineAuthor(article.author_name, masthead.authors);
  const topic = topicForText(`${article.title} ${article.summary ?? ''}`);
  const regionHub = regionForName(article.region);
  const [ctx, courtCase] = await Promise.all([getArticleContext(article, topic?.terms ?? null), getCaseForArticle(article.id).catch(() => null)]);
  const later = [
    ...(courtCase?.articles ?? []),
    ...ctx.siblings,
  ].filter((r, i, arr) => r.id !== article.id && r.published_at && article.published_at && r.published_at > article.published_at && arr.findIndex((x) => x.id === r.id) === i)
    .sort((x, y) => (x.published_at ?? '').localeCompare(y.published_at ?? ''));
  const img = imageMeta(article);

  return (
    <Layout>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: clipAtWord(title, 110),
            description: article.seo_description || article.summary,
            image: jsonLdImages(article, img),
            datePublished: article.published_at,
            dateModified: articleModified(article),
            author: author?.kind === 'person'
              ? { '@type': 'Person', name: authorName, url: `${BASE_URL}${author.href}`, ...(author.entry.same_as?.length ? { sameAs: author.entry.same_as } : {}) }
              : author?.kind === 'desk'
                ? { '@type': 'Organization', name: authorName, url: `${BASE_URL}${author.href}` }
                : { '@type': 'Organization', name: authorName, url: `${BASE_URL}/about` },
            publisher: publisherRef,
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
      <ArticleView categorySlug={categorySlug} articleSlug={articleSlug} initialArticle={article} thread={ctx.thread} authorHref={author?.href} updates={await getStoryUpdates(article.id)}>
        {later.length > 0 && <LinkList title="What happened next" rows={later as LinkRow[]} />}
        {courtCase && (
          <section className="mt-8 rounded-md border border-border bg-card p-4 font-sans text-sm">
            <h2 className="font-headline text-lg font-bold text-foreground">Case tracker</h2>
            {courtCase.c.next_hearing && courtCase.c.next_hearing >= new Date().toISOString().slice(0, 10)
              ? <p className="mt-1">Next hearing, as reported: <strong>{formatHearing(courtCase.c.next_hearing)}</strong>.</p>
              : <p className="mt-1 text-muted-foreground">No upcoming hearing date has been reported.</p>}
            <p className="mt-2"><a href={`/courts/cases/${courtCase.c.slug}`} className="text-primary underline underline-offset-2">Status and full timeline of this case</a></p>
          </section>
        )}
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
