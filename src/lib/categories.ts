export const CATEGORIES = [
  { slug: 'top-stories', label: 'Top Stories', intro: 'The latest verified crime and justice stories from across Ghana, newest first.' },
  { slug: 'violent-crime', label: 'Violent Crime', intro: 'Reports on murders, robberies, assaults and other violent crime in Ghana, based on police statements, court records and published reports.' },
  { slug: 'property-crime', label: 'Property Crime', intro: "Burglary, theft, vehicle crime and other property offences reported across Ghana's regions." },
  { slug: 'cybercrime', label: 'Cybercrime', intro: 'Online fraud, hacking, sextortion and other cybercrime affecting people and businesses in Ghana.' },
  { slug: 'fraud-scams', label: 'Fraud & Scams', intro: 'Investment schemes, romance and mobile-money scams, impersonation and other fraud in Ghana, with arrests and court outcomes.' },
  { slug: 'drug-offences', label: 'Drug Offences', intro: 'Narcotics seizures, trafficking cases and drug-related arrests and prosecutions in Ghana.' },
  { slug: 'domestic-violence', label: 'Domestic Violence', intro: 'Reports of domestic and family violence in Ghana, including DOVVSU cases and court outcomes.' },
  { slug: 'traffic-offences', label: 'Traffic & Road Safety', intro: 'Road crashes, dangerous driving, traffic enforcement and road-safety news from Ghana.' },
  { slug: 'youth-crime', label: 'Youth Crime', intro: 'Crime involving young people in Ghana, reported without identifying minors.' },
  { slug: 'organised-crime', label: 'Organised Crime', intro: 'Gangs, illegal mining, smuggling and trafficking networks operating in or through Ghana.' },
  { slug: 'white-collar-crime', label: 'White Collar Crime', intro: 'Corruption, embezzlement, procurement fraud and financial crime involving public offices and companies in Ghana.' },
  { slug: 'police-reports', label: 'Police Reports', intro: 'Arrests, operations and official statements from the Ghana Police Service and other security agencies.' },
  { slug: 'court-cases', label: 'Court Cases & Judgments', intro: "Arraignments, trials, judgments and sentences from Ghana's courts. Everyone accused is presumed innocent unless found guilty." },
  { slug: 'prison-news', label: 'Prisons & Corrections', intro: "News from Ghana's prisons and correctional system, including escapes, pardons, conditions and reform." },
  { slug: 'crime-prevention', label: 'Crime Prevention', intro: 'Safety advice, public warnings and crime-prevention initiatives for communities across Ghana.' },
  { slug: 'crime-statistics', label: 'Crime Statistics & Data', intro: 'Figures and data on crime in Ghana from official and published sources.' },
  { slug: 'investigations', label: 'Investigations & Cold Cases', intro: 'In-depth reporting and updates on unsolved cases in Ghana.' },
  { slug: 'most-wanted', label: 'Most Wanted & Alerts', intro: 'Wanted-person and public alert notices issued by Ghanaian authorities.' },
] as const;

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
