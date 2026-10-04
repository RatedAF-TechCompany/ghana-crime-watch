import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';
import { NAV_CATEGORIES } from '@/lib/categories';
import { ARTICLES_PER_SITEMAP, xmlResponse } from '@/lib/feeds';

export const revalidate = 600;

const STATIC_PATHS = ['/', '/about', '/editorial-policy', '/corrections', '/contact', '/tips', '/privacy', '/terms', '/fraud-watch'];

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
      .select('thread_slug, updated_at')
      .or(`is_live.eq.true,live_ended_at.gte.${thirtyDaysAgo}`);
    return xmlResponse(
      urlset([
        ...STATIC_PATHS.map((p) => ({ loc: `${BASE_URL}${p}` })),
        ...NAV_CATEGORIES.map((c) => ({ loc: `${BASE_URL}/${c.slug}` })),
        ...(threads ?? []).map((t) => ({ loc: `${BASE_URL}/live/${t.thread_slug}`, lastmod: t.updated_at ? new Date(t.updated_at).toISOString() : null })),
      ]),
    );
  }

  const m = file.match(/^articles-(\d+)\.xml$/);
  if (!m) return new Response('Not found', { status: 404 });
  const page = parseInt(m[1], 10);
  if (page < 1) return new Response('Not found', { status: 404 });

  // PostgREST caps a single response at 1000 rows; page through in chunks.
  const start = (page - 1) * ARTICLES_PER_SITEMAP;
  const rows: { category_slug: string; article_slug: string; updated_at: string | null; published_at: string | null }[] = [];
  for (let off = 0; off < ARTICLES_PER_SITEMAP; off += 1000) {
    const { data } = await supabase
      .from('articles')
      .select('category_slug, article_slug, updated_at, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(start + off, start + off + 999);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  if (rows.length === 0) return new Response('Not found', { status: 404 });

  return xmlResponse(
    urlset(
      rows.map((a) => ({
        loc: `${BASE_URL}/${a.category_slug}/${a.article_slug}`,
        lastmod: a.updated_at || a.published_at ? new Date((a.updated_at || a.published_at)!).toISOString() : null,
      })),
    ),
  );
}
