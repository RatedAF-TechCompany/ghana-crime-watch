export const CATEGORIES = [
  { slug: 'top-stories', label: 'Top Stories' },
  { slug: 'violent-crime', label: 'Violent Crime' },
  { slug: 'property-crime', label: 'Property Crime' },
  { slug: 'cybercrime', label: 'Cybercrime' },
  { slug: 'fraud-scams', label: 'Fraud & Scams' },
  { slug: 'drug-offences', label: 'Drug Offences' },
  { slug: 'domestic-violence', label: 'Domestic Violence' },
  { slug: 'traffic-offences', label: 'Traffic & Road Safety' },
  { slug: 'youth-crime', label: 'Youth Crime' },
  { slug: 'organised-crime', label: 'Organised Crime' },
  { slug: 'white-collar-crime', label: 'White Collar Crime' },
  { slug: 'police-reports', label: 'Police Reports' },
  { slug: 'court-cases', label: 'Court Cases & Judgments' },
  { slug: 'prison-news', label: 'Prisons & Corrections' },
  { slug: 'crime-prevention', label: 'Crime Prevention' },
  { slug: 'crime-statistics', label: 'Crime Statistics & Data' },
  { slug: 'investigations', label: 'Investigations & Cold Cases' },
  { slug: 'most-wanted', label: 'Most Wanted & Alerts' },
] as const;

export type CategorySlug = typeof CATEGORIES[number]['slug'];

/** Sections not yet built as real products; hidden from nav, footer and sitemap. */
const HIDDEN_FROM_NAV = new Set<string>(['crime-statistics', 'most-wanted']);

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
