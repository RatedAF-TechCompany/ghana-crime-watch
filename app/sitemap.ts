import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const { data: articles } = await supabase
    .from('articles')
    .select('article_slug, category_slug, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: threads } = await supabase
    .from('story_threads')
    .select('thread_slug, is_live, live_ended_at, updated_at')
    .or(`is_live.eq.true,live_ended_at.gte.${thirtyDaysAgo}`);

  return [
    { url: BASE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/fraud-watch`, changeFrequency: 'daily', priority: 0.7 },
    ...CATEGORIES.map((c) => ({
      url: `${BASE_URL}/${c.slug}`,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
    ...(threads ?? []).map((t) => ({
      url: `${BASE_URL}/live/${t.thread_slug}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: t.is_live ? ('hourly' as const) : ('weekly' as const),
      priority: t.is_live ? 0.95 : 0.6,
    })),
    ...(articles ?? []).map((a) => ({
      url: `${BASE_URL}/${a.category_slug}/${a.article_slug}`,
      lastModified: a.published_at ? new Date(a.published_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];
}
