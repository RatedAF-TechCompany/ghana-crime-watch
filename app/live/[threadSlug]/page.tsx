import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import { LiveRefresher } from '@/components/LiveRefresher';
import { LiveDevelopingPill } from '@/components/LiveDevelopingPill';
import { BASE_URL } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import { sanitizeArticleBody } from '@/lib/sanitize';
import { OG_HEIGHT, OG_WIDTH, formatGhanaDate, formatGhanaTime, hubSocialImage, isIndexableThread } from '@/lib/article-meta';

export const revalidate = 120;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Params = Promise<{ threadSlug: string }>;

const getThread = cache(async (slug: string) => {
  const supabase = createServerClient();
  const { data: thread } = await supabase
    .from('story_threads')
    .select('id, thread_slug, title, summary, is_live, live_started_at, live_ended_at, created_at, content_updated_at')
    .eq('thread_slug', slug)
    .maybeSingle();
  if (!thread) return null;
  const [{ data: updates }, { data: articles }] = await Promise.all([
    supabase.from('thread_updates').select('id, title, body, is_key_point, key_point_label, published_at')
      .eq('thread_id', thread.id).order('published_at', { ascending: false }).limit(500),
    supabase.from('articles').select('id, title, category_slug, article_slug, published_at')
      .eq('thread_id', thread.id).eq('is_published', true).order('published_at', { ascending: true }).limit(50),
  ]);
  return { thread, updates: updates ?? [], articles: articles ?? [] };
});

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { threadSlug } = await params;
  const data = await getThread(threadSlug);
  if (!data) return { title: 'Live Updates Not Found', robots: { index: false } };
  const { thread, updates } = data;
  const title = `${thread.title} - live updates`;
  const description = thread.summary || `Follow live updates on ${thread.title}.`;
  const canonical = `${BASE_URL}/live/${threadSlug}`;
  const image = { url: hubSocialImage(`live-${threadSlug}`), width: OG_WIDTH, height: OG_HEIGHT };
  return {
    title,
    description,
    alternates: { canonical },
    ...(isIndexableThread(threadSlug, updates.length) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: canonical, type: 'article', siteName: 'GhanaCrimes', images: [image] },
    twitter: { card: 'summary_large_image', site: '@GhanaCrimes', title, description, images: [image] },
  };
}

export default async function LiveThreadPage({ params }: { params: Params }) {
  const { threadSlug } = await params;
  const data = await getThread(threadSlug);
  if (!data) notFound();
  const { thread, updates, articles } = data;
  const canonical = `${BASE_URL}/live/${threadSlug}`;
  const started = thread.live_started_at || thread.created_at;
  const modified = thread.content_updated_at || updates[0]?.published_at || started;
  const live = thread.is_live && !thread.live_ended_at;
  const main = articles[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LiveBlogPosting',
    '@id': canonical,
    url: canonical,
    headline: thread.title.slice(0, 110),
    description: thread.summary || `Live updates on ${thread.title}.`,
    image: [{ '@type': 'ImageObject', url: hubSocialImage(`live-${threadSlug}`), width: OG_WIDTH, height: OG_HEIGHT }],
    datePublished: started,
    dateModified: modified,
    coverageStartTime: started,
    ...(thread.live_ended_at ? { coverageEndTime: thread.live_ended_at } : {}),
    author: { '@type': 'Organization', name: 'GhanaCrimes', url: `${BASE_URL}/about` },
    publisher: { '@type': 'Organization', name: 'GhanaCrimes', logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.png` } },
    mainEntityOfPage: canonical,
    ...(main ? { isBasedOn: `${BASE_URL}/${main.category_slug}/${main.article_slug}` } : {}),
    liveBlogUpdate: updates.map((u) => ({
      '@type': 'BlogPosting',
      headline: u.title.slice(0, 110),
      datePublished: u.published_at,
      articleBody: plain(u.body),
      url: `${canonical}#update-${u.id}`,
    })),
  };

  return (
    <Layout>
      <JsonLd data={jsonLd} />
      {live && <LiveRefresher />}
      <article className="mx-auto max-w-[760px]">
        <div className="mb-3 flex justify-center">{live ? <LiveDevelopingPill /> : <span className="author-italic-red">Live coverage ended</span>}</div>
        <h1 className="mb-4 text-center font-headline text-[32px] font-bold leading-[1.1] text-foreground md:text-[46px]">{thread.title}</h1>
        {thread.summary && <p className="mb-4 text-center font-body text-[19px] leading-[1.5] text-foreground/80">{thread.summary}</p>}
        <p className="mb-6 text-center font-sans text-[13px] text-muted-foreground">
          Started {formatGhanaDate(started)}, {formatGhanaTime(started)} · Last update {formatGhanaDate(modified)}, {formatGhanaTime(modified)}
        </p>
        {main && (
          <p className="mb-8 border-y border-border py-3 text-center text-sm">
            Main report: <a href={`/${main.category_slug}/${main.article_slug}`} className="text-primary underline underline-offset-2">{main.title}</a>
          </p>
        )}

        {updates.length === 0 ? (
          <p className="text-center text-muted-foreground">No updates have been posted yet.</p>
        ) : (
          <ol className="space-y-6 border-l-2 border-border pl-6">
            {updates.map((u) => (
              <li key={u.id} id={`update-${u.id}`} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary" aria-hidden />
                <time dateTime={u.published_at} className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
                  {formatGhanaDate(u.published_at)}, {formatGhanaTime(u.published_at)}
                </time>
                {u.is_key_point && u.key_point_label && <p className="mt-1 text-xs font-semibold text-primary">{u.key_point_label}</p>}
                <h2 className="mt-1 font-headline text-lg font-bold text-foreground">{u.title}</h2>
                <div className="article-body mt-2 text-[15px]" dangerouslySetInnerHTML={{ __html: sanitizeArticleBody(u.body) }} />
              </li>
            ))}
          </ol>
        )}

        {articles.length > 1 && (
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="mb-4 font-headline text-xl font-bold">Reports in this story</h2>
            <ul className="space-y-2">
              {[...articles].reverse().map((a) => (
                <li key={a.id}><a href={`/${a.category_slug}/${a.article_slug}`} className="hover:text-primary">{a.title}</a></li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </Layout>
  );
}
