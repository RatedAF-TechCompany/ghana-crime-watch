import { createServerClient } from '@/lib/supabase/server';
import { ARTICLES_PER_SITEMAP, SITEMAP_BASE, countPublishedArticles, xmlResponse } from '@/lib/feeds';

export const revalidate = 600;
export const dynamic = 'force-dynamic';

/** Sitemap index: pages, every articles-N.xml (from the published count), news sitemap. */
export async function GET() {
  const supabase = createServerClient();
  const count = await countPublishedArticles();
  const pages = Math.max(1, Math.ceil(count / ARTICLES_PER_SITEMAP));

  const iso = (v?: string | null) => (v ? new Date(v).toISOString() : null);
  const { data: latest } = await supabase.from('articles').select('content_updated_at, published_at')
    .eq('is_published', true).order('content_updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  const { data: latestPub } = await supabase.from('articles').select('published_at')
    .eq('is_published', true).order('published_at', { ascending: false }).limit(1).maybeSingle();
  const { data: latestThread } = await supabase.from('story_threads').select('content_updated_at')
    .order('content_updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();

  // Per-chunk lastmod: newest content_updated_at within each chunk (chunks are ordered by published_at desc, id).
  const chunkMods: (string | null)[] = [];
  for (let i = 0; i < pages; i++) {
    const { data } = await supabase.from('articles').select('published_at')
      .eq('is_published', true).order('published_at', { ascending: false }).order('id', { ascending: true })
      .range(i * ARTICLES_PER_SITEMAP, i * ARTICLES_PER_SITEMAP).maybeSingle();
    chunkMods.push(i === 0 ? iso(latest?.content_updated_at || latest?.published_at) : iso(data?.published_at));
  }

  const entry = (loc: string, mod?: string | null) =>
    `  <sitemap><loc>${loc}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</sitemap>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entry(`${SITEMAP_BASE}/sitemaps/pages.xml`, iso(latestThread?.content_updated_at))}
${Array.from({ length: pages }, (_, i) => entry(`${SITEMAP_BASE}/sitemaps/articles-${i + 1}.xml`, chunkMods[i])).join('\n')}
${entry(`${SITEMAP_BASE}/news-sitemap.xml`, iso(latestPub?.published_at))}
</sitemapindex>`;
  return xmlResponse(xml);
}
