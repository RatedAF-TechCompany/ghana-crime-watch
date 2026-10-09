import { articleModified } from '@/lib/article-meta';
import { createServerClient } from '@/lib/supabase/server';
import { NAV_CATEGORIES } from '@/lib/categories';
import { ARTICLES_PER_SITEMAP, SITEMAP_BASE as BASE_URL, countPublishedArticles, xmlResponse } from '@/lib/feeds';
import { REGIONS, TOPICS } from '@/lib/hubs';
import { EXPLAINERS } from '@/lib/explainers';
import { isIndexableThread } from '@/lib/article-meta';

export const revalidate = 600;
export const dynamic = 'force-dynamic';

const STATIC_PATHS = [
  '/',
  '/about',
  '/editorial-policy',
  '/ai-use',
  '/corrections',
  '/contact',
  '/tips',
  '/privacy',
  '/terms',
  '/fraud-watch',
  '/map',
  '/statistics',
  '/courts',
  '/wanted',
  '/missing',
  '/safety',
  '/alerts',
  '/explainers',
  '/regions',
  '/topics',
];

function urlset(urls: { loc: string; lastmod?: string | null }[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const supabase = createServerClient();

  if (file === 'pages.xml') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: threads } = await supabase
      .from('story_threads')
      .select('id, thread_slug, content_updated_at')
      .or(`is_live.eq.true,live_ended_at.gte.${thirtyDaysAgo}`);
    const ids = (threads ?? []).map((t) => t.id);
    // Page through updates: the API returns at most 1000 rows per request.
    const counts = new Map<string, number>();
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      for (let off = 0; ; off += 1000) {
        const { data: ups } = await supabase.from('thread_updates').select('thread_id').in('thread_id', chunk).range(off, off + 999);
        for (const u of ups ?? []) counts.set(u.thread_id, (counts.get(u.thread_id) ?? 0) + 1);
        if (!ups || ups.length < 1000) break;
      }
    }
    const indexable = (threads ?? []).filter((t) => isIndexableThread(t.thread_slug, counts.get(t.id) ?? 0));

    const pages = [
      ...STATIC_PATHS.map((p) => ({ loc: `${BASE_URL}${p}` })),
      ...NAV_CATEGORIES.map((c) => ({ loc: `${BASE_URL}/${c.slug}` })),
      ...REGIONS.map((r) => ({ loc: `${BASE_URL}/regions/${r.slug}` })),
      ...TOPICS.map((t) => ({ loc: `${BASE_URL}/topics/${t.slug}` })),
      ...EXPLAINERS.map((e) => ({ 
        loc: `${BASE_URL}/explainers/${e.slug}`,
        lastmod: new Date(e.updated).toISOString()
      })),
      ...indexable.map((t) => ({
        loc: `${BASE_URL}/live/${t.thread_slug}`,
        lastmod: t.content_updated_at ? new Date(t.content_updated_at).toISOString() : null,
      })),
    ];

    return xmlResponse(urlset(pages));
  }

  const m = file.match(/^articles-(\d+)\.xml$/);
  if (!m) return new Response('Not found', { status: 404 });
  const page = parseInt(m[1], 10);
  if (page < 1 || page > Math.max(1, Math.ceil((await countPublishedArticles()) / ARTICLES_PER_SITEMAP))) return new Response('Not found', { status: 404 });

  const start = (page - 1) * ARTICLES_PER_SITEMAP;
  const rows: { category_slug: string; article_slug: string; content_updated_at: string | null; published_at: string | null }[] = [];
  for (let off = 0; off < ARTICLES_PER_SITEMAP; off += 1000) {
    const end = Math.min(off + 999, ARTICLES_PER_SITEMAP - 1);
    const { data } = await supabase
      .from('articles')
      .select('category_slug, article_slug, content_updated_at, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .order('id', { ascending: true })
      .range(start + off, start + end);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < end - off + 1) break;
  }
  if (rows.length === 0) return new Response('Not found', { status: 404 });

  return xmlResponse(
    urlset(
      rows.map((a) => ({
        loc: `${BASE_URL}/${a.category_slug}/${a.article_slug}`,
        lastmod: articleModified(a) ? new Date(articleModified(a)!).toISOString() : null,
      })),
    ),
  );
}
