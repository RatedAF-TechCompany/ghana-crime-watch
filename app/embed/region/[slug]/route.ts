import { getRegion, getRegionArticles } from '@/lib/hubs';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 900;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Embeddable "Latest crime in <region>" widget (iframe). Links open on ghanacrimes.com. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = getRegion(slug);
  if (!r) return new Response('Unknown region', { status: 404 });
  const rows = (await getRegionArticles(r.name, 5)) as { title: string; category_slug: string; article_slug: string; published_at: string }[];
  const items = rows.map((a) => `<li><a target="_blank" rel="noopener" href="${BASE_URL}/${esc(a.category_slug)}/${esc(a.article_slug)}?utm_source=widget&utm_medium=embed">${esc(a.title)}</a><span>${new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' })}</span></li>`).join('') || '<li>No recent stories.</li>';
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Latest crime in ${esc(r.name)}</title>
<style>body{margin:0;font:14px/1.4 system-ui,sans-serif;color:#111;background:#fff}h1{font-size:14px;margin:0;padding:8px 10px;background:#b91c1c;color:#fff}ul{list-style:none;margin:0;padding:0 10px}li{padding:7px 0;border-bottom:1px solid #eee}li span{display:block;color:#666;font-size:12px}a{color:#111;text-decoration:none;font-weight:600}a:hover{text-decoration:underline}p{margin:6px 10px;font-size:12px}p a{color:#b91c1c}</style>
<h1>Latest crime in ${esc(r.name)}</h1><ul>${items}</ul><p>Powered by <a target="_blank" rel="noopener" href="${BASE_URL}/regions/${esc(slug)}?utm_source=widget">GhanaCrimes</a></p></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' } });
}
