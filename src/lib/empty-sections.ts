import { createServerClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';

// One query for the slug column of published articles (~190 rows, tiny), memoised per isolate for 5 min.
const TTL_MS = 5 * 60 * 1000;
let memo: { at: number; value: string[] } | null = null;
let inflight: Promise<string[]> | null = null;

async function load(): Promise<string[] | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('articles').select('category_slug').eq('is_published', true).limit(10000);
  if (error || !data) return null;
  const live = new Set(data.map((r: { category_slug: string }) => r.category_slug));
  return CATEGORIES.filter((c) => c.slug !== 'top-stories' && !live.has(c.slug)).map((c) => c.slug);
}

/** Section slugs with zero published articles (hidden from menus; they 404). Fails open: [] on error. */
export async function getEmptySections(): Promise<string[]> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  if (!inflight) {
    inflight = load()
      .then((v) => { if (v) memo = { at: Date.now(), value: v }; return v ?? memo?.value ?? []; })
      .catch(() => memo?.value ?? [])
      .finally(() => { inflight = null; });
  }
  return inflight;
}
