import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';

export const ARTICLES_PER_SITEMAP = 4500;
/** Sitemaps always use the canonical domain, regardless of deploy env. */
export const SITEMAP_BASE = 'https://www.ghanacrimes.com';

/** Exact published-article count; falls back to paging ids if the count header is missing. */
export async function countPublishedArticles(): Promise<number> {
  const supabase = createServerClient();
  const { count } = await supabase.from('articles').select('id', { count: 'exact' }).eq('is_published', true).limit(1);
  if (typeof count === 'number') return count;
  let n = 0;
  for (let off = 0; ; off += 1000) {
    const { data } = await supabase.from('articles').select('id').eq('is_published', true).range(off, off + 999);
    n += data?.length ?? 0;
    if (!data || data.length < 1000) return n;
  }
}

export function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function buildRss(): Promise<Response> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('articles')
    .select('title, summary, article_slug, category_slug, published_at, updated_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50);

  const items = (data ?? [])
    .map((a) => {
      const url = `${BASE_URL}/${a.category_slug}/${a.article_slug}`;
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.summary || '')}</description>
      <category>${escapeXml(a.category_slug)}</category>
      ${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ''}
    </item>`;
    })
    .join('\n');

  const latest = data?.[0]?.published_at ? new Date(data[0].published_at).toUTCString() : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GhanaCrimes</title>
    <link>${BASE_URL}/</link>
    <description>Factual, verified crime news from Ghana</description>
    <language>en-gh</language>
    <lastBuildDate>${latest}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

export function xmlResponse(xml: string, maxAge = 600) {
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}` },
  });
}
