import { CATEGORIES } from '../../supabase/functions/_shared/categories';
export { CATEGORIES, EDITOR_CATEGORIES, EDITOR_CATEGORY_SLUGS, ALL_CATEGORY_SLUGS } from '../../supabase/functions/_shared/categories';

export type CategorySlug = typeof CATEGORIES[number]['slug'];

/** Sections not yet built as real products; hidden from nav, footer and sitemap. */
export const HIDDEN_CATEGORIES = ['crime-statistics', 'most-wanted'] as const;
const HIDDEN_FROM_NAV = new Set<string>(HIDDEN_CATEGORIES);

/** Categories shown in navigation, footer and sitemap. */
export const NAV_CATEGORIES = CATEGORIES.filter((c) => !HIDDEN_FROM_NAV.has(c.slug));

/** Extra slugs that are valid for article URLs but not listed as sections. */
const EXTRA_VALID = new Set<string>(['breaking-news']);

export function isValidCategory(slug: string): boolean {
  return CATEGORIES.some((c) => c.slug === slug) || EXTRA_VALID.has(slug);
}

export function getCategoryLabel(slug: string): string {
  if (slug === 'breaking-news') return 'Breaking News';
  const category = CATEGORIES.find(c => c.slug === slug);
  return category?.label || slug;
}

export const CATEGORY_INTROS = Object.fromEntries(CATEGORIES.map((category) => [category.slug, category.intro])) as Record<string, string>;

export function categoryTitle(slug: string): string {
  const label = getCategoryLabel(slug);
  return /News$/i.test(label) ? label : `${label} News`;
}
