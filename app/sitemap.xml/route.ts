import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';
import { ARTICLES_PER_SITEMAP, xmlResponse } from '@/lib/feeds';

export const revalidate = 600;

/** Sitemap index: static pages, live threads, paginated article sitemaps, news sitemap. */
export async function GET() {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  const { data: latest } = await supabase
    .from('articles')
    .select('published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const pages = Math.max(1, Math.ceil((count ?? 0) / ARTICLES_PER_SITEMAP));
  const lastmod = latest?.published_at ? new Date(latest.published_at).toISOString() : null;
  const entry = (loc: string, mod?: string | null) =>
    `  <sitemap><loc>${loc}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</sitemap>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entry(`${BASE_URL}/sitemaps/pages.xml`)}
${Array.from({ length: pages }, (_, i) => entry(`${BASE_URL}/sitemaps/articles-${i + 1}.xml`, i === 0 ? lastmod : null)).join('\n')}
${entry(`${BASE_URL}/news-sitemap.xml`, lastmod)}
</sitemapindex>`;
  return xmlResponse(xml);
}
