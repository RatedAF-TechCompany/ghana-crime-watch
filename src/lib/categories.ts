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

export function getCategoryLabel(slug: string): string {
  const category = CATEGORIES.find(c => c.slug === slug);
  return category?.label || slug;
}
