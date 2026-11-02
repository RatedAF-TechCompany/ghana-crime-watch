import { createServerClient } from '@/lib/supabase/server';

export const revalidate = 300;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Text-only latest stories: no JavaScript, no images, well under 50 KB. */
export async function GET() {
  const { data } = await createServerClient().from('articles').select('title, summary, category_slug, article_slug, published_at')
    .eq('is_published', true).order('published_at', { ascending: false }).limit(40);
  const items = (data ?? []).map((a) => `<li><a href="/lite/${esc(a.category_slug)}/${esc(a.article_slug)}">${esc(a.title)}</a><br><small>${new Date(a.published_at).toLocaleString('en-GB', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} GMT</small></li>`).join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>GhanaCrimes (text-only)</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:0 auto;padding:12px}li{margin:0 0 12px}a{color:#b91c1c}</style>
<h1>GhanaCrimes <small>text-only</small></h1><p><a href="/">Full site</a> · Emergency: <a href="tel:191">191</a> · <a href="tel:112">112</a></p><ol>${items}</ol></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
