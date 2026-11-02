import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** What a payload-free push shows: the newest published story. */
export async function GET() {
  const { data } = await createServerClient().from('articles').select('title, summary, category_slug, article_slug, published_at')
    .eq('is_published', true).order('published_at', { ascending: false }).limit(1).maybeSingle();
  const body = data ? { title: data.title, body: (data.summary ?? '').slice(0, 140), url: `/${data.category_slug}/${data.article_slug}`, published_at: data.published_at } : null;
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
