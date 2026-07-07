import { createServerClient } from '@/lib/supabase/server';

const BASE_URL = 'https://ghanacrimes.com';

export async function GET() {
  const supabase = createServerClient();

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: articles } = await supabase
    .from('articles')
    .select('title, article_slug, category_slug, published_at')
    .eq('is_published', true)
    .gte('published_at', twoDaysAgo)
    .order('published_at', { ascending: false })
    .limit(1000);

  const urls = (articles ?? [])
    .map((a) => {
      const loc = `${BASE_URL}/${a.category_slug}/${a.article_slug}`;
      const pubDate = new Date(a.published_at).toISOString();
      const title = a.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>GhanaCrimes</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
