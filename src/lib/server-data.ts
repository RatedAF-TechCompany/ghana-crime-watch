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

export async function getHomeArticles() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('articles')
    .select(LIST_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(0, HOME_PAGE_SIZE);
  return data ?? [];
}

export async function getCategoryArticles(categorySlug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('articles')
    .select(LIST_COLUMNS)
    .eq('is_published', true)
    .eq('category_slug', categorySlug)
    .order('published_at', { ascending: false })
    .range(0, CATEGORY_PAGE_SIZE);
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
