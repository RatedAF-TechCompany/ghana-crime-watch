import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';

/** Section slugs with zero published articles (hidden from menus; they 404). Fails open: [] on error. */
export const getEmptySections = cache(async (): Promise<string[]> => {
  try {
    const supabase = createServerClient();
    const results = await Promise.all(CATEGORIES.filter((c) => c.slug !== 'top-stories').map(async (c) => {
      const { count, error } = await supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('category_slug', c.slug);
      return error || count === null ? null : count === 0 ? c.slug : null;
    }));
    return results.filter(Boolean) as string[];
  } catch { return []; }
});
