import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export const HOME_PAGE_SIZE = 30;
export const CATEGORY_PAGE_SIZE = 17;

const LIST_COLUMNS =
  'id, title, summary, body, category_slug, article_slug, published_at, hero_image';

export const getArticle = cache(async (categorySlug: string, articleSlug: string) => {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('category_slug', categorySlug)
    .eq('article_slug', articleSlug)
    .eq('is_published', true)
    .maybeSingle();
  return data;
});

/**
 * Resolve legacy slug variants (with/without a trailing epoch-number suffix)
 * so old and new URLs keep working via a permanent redirect.
 */
export async function findSlugRedirect(categorySlug: string, articleSlug: string) {
  const supabase = createServerClient();
  const stripped = articleSlug.replace(/-(\d{10,}|[0-9a-z]{8,9})$/, '');
  const candidates: string[] = [];
  if (stripped !== articleSlug) candidates.push(stripped);

  for (const slug of candidates) {
    const { data } = await supabase
      .from('articles')
      .select('category_slug, article_slug')
      .eq('article_slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (data) return `/${data.category_slug}/${data.article_slug}`;
  }

  // Same slug, wrong category
  const { data: other } = await supabase
    .from('articles')
    .select('category_slug, article_slug')
    .eq('article_slug', articleSlug)
    .eq('is_published', true)
    .limit(1)
    .maybeSingle();
  if (other && other.category_slug !== categorySlug) {
    return `/${other.category_slug}/${other.article_slug}`;
  }
  return null;
}

/** What to do with an article URL that has no published row: redirect, gone (410-like 404), or unknown. Null on RPC error. */
export async function getArticleRouteState(categorySlug: string, articleSlug: string) {
  const supabase = createServerClient();
  const { data, error } = await (supabase as any).rpc('article_route_state', { _category: categorySlug, _slug: articleSlug });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? (row as { state: string; target: string | null }) : null;
}

export async function getHomeArticles() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('articles')
    .select(LIST_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(0, HOME_PAGE_SIZE);
  if (error) throw new Error(`getHomeArticles: ${error.message}`);
  return data ?? [];
}

export async function getCategoryArticles(categorySlug: string) {
  const supabase = createServerClient();
  // 'top-stories' means the latest published stories across all crime sections.
  let q = supabase.from('articles').select(LIST_COLUMNS).eq('is_published', true);
  if (categorySlug !== 'top-stories') q = q.eq('category_slug', categorySlug);
  const { data, error } = await q
    .order('published_at', { ascending: false })
    .range(0, CATEGORY_PAGE_SIZE);
  if (error) throw new Error(`getCategoryArticles: ${error.message}`);
  return data ?? [];
}

export async function getLatestHeadlines(limit = 8) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('articles')
    .select('id, title, category_slug, article_slug, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

type ArticleCtx = { id: string; title: string; category_slug: string; region?: string | null; thread_id?: string | null };
const LINK_COLS = 'id, title, category_slug, article_slug, published_at';

/** Server-rendered story context: thread siblings, related stories, and the thread itself. */
export const getArticleContext = cache(async (a: ArticleCtx, topicTerms: readonly string[] | null) => {
  const supabase = createServerClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const threadP = a.thread_id
    ? Promise.all([
        supabase.from('story_threads').select('id, thread_slug, title, is_live, live_ended_at').eq('id', a.thread_id).maybeSingle(),
        supabase.from('articles').select(LINK_COLS).eq('thread_id', a.thread_id).eq('is_published', true).neq('id', a.id)
          .order('published_at', { ascending: false }).limit(20),
      ])
    : Promise.resolve(null);

  const near: { or?: string; region?: string }[] = [];
  if (a.region) near.push({ region: a.region });
  if (topicTerms?.length) near.push({ or: topicTerms.map((t) => `title.ilike.%${t}%`).join(',') });

  const nearRows = await Promise.all(near.map(async (n) => {
    let q = supabase.from('articles').select(LINK_COLS).eq('is_published', true).neq('id', a.id).gte('published_at', since);
    if (n.region) q = q.eq('region', n.region);
    if (n.or) q = q.or(n.or);
    const { data } = await q.order('published_at', { ascending: false }).limit(6);
    return data ?? [];
  }));
  const { data: sameCat } = await supabase.from('articles').select(LINK_COLS).eq('is_published', true).neq('id', a.id)
    .eq('category_slug', a.category_slug).order('published_at', { ascending: false }).limit(12);

  const thread = await threadP;
  const siblings = thread?.[1].data ?? [];
  const exclude = new Set<string>(siblings.map((s) => s.id));
  const related: typeof siblings = [];
  for (const r of [...nearRows.flat().sort((x, y) => (y.published_at ?? '').localeCompare(x.published_at ?? '')), ...(sameCat ?? [])]) {
    if (related.length >= 6) break;
    if (exclude.has(r.id)) continue;
    exclude.add(r.id);
    related.push(r);
  }
  return { thread: thread?.[0].data ?? null, siblings, related };
});
