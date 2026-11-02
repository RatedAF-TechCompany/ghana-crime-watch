import { getArticle } from '@/lib/server-data';
import { sanitizeArticleBody } from '@/lib/sanitize';
import { formatArticleBody } from '@/lib/paragraphs';

export const revalidate = 300;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Text-only article: sanitised body with images stripped, no JavaScript. */
export async function GET(_: Request, { params }: { params: Promise<{ categorySlug: string; articleSlug: string }> }) {
  const { categorySlug, articleSlug } = await params;
  const a = await getArticle(categorySlug, articleSlug);
  if (!a) return new Response('Not found', { status: 404 });
  const body = sanitizeArticleBody(formatArticleBody(a.body ?? '')).replace(/<(img|picture|iframe|video|figure)[\s\S]*?(\/>|<\/\1>|>)/gi, '');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.title)}</title>
<link rel="canonical" href="https://www.ghanacrimes.com/${esc(categorySlug)}/${esc(articleSlug)}">
<style>body{font:17px/1.6 system-ui,sans-serif;max-width:640px;margin:0 auto;padding:12px}a{color:#b91c1c}</style>
<p><a href="/lite">&larr; Text-only home</a> · <a href="/${esc(categorySlug)}/${esc(articleSlug)}">Full version</a></p><h1>${esc(a.title)}</h1>${body}</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
