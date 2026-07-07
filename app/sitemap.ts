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

  return [
    { url: BASE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/fraud-watch`, changeFrequency: 'daily', priority: 0.7 },
    ...CATEGORIES.map((c) => ({
      url: `${BASE_URL}/${c.slug}`,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
    ...(articles ?? []).map((a) => ({
      url: `${BASE_URL}/${a.category_slug}/${a.article_slug}`,
      lastModified: a.published_at ? new Date(a.published_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];
}
