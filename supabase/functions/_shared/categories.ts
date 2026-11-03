// SINGLE SOURCE OF TRUTH for GhanaCrimes categories. Imported by the Next.js site (src/lib/categories.ts)
// and by every edge function (run-newsroom, source-ingest, tweet-ingest, manual-article-submit, generate-article-fields).
// Plain TypeScript, no imports, so it works in both Node and Deno.
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

/** Every valid category_slug (matches the database CHECK constraint). */
export const ALL_CATEGORY_SLUGS: string[] = CATEGORIES.map((c) => c.slug);

/** The 9 categories editors and AI drafts choose from (standing editor prompt). */
export const EDITOR_CATEGORY_SLUGS = [
  'violent-crime', 'court-cases', 'fraud-scams', 'white-collar-crime', 'organised-crime',
  'police-reports', 'property-crime', 'investigations', 'crime-prevention',
] as const;

export const EDITOR_CATEGORIES = EDITOR_CATEGORY_SLUGS.map((s) => CATEGORIES.find((c) => c.slug === s)!);

/** "Violent Crime (violent-crime), Court Cases & Judgments (court-cases), ..." for prompts. */
export const EDITOR_CATEGORY_PROMPT = EDITOR_CATEGORIES.map((c) => `${c.label} (${c.slug})`).join(', ');

/** Out-of-scope or legacy slugs mapped to the nearest editor category for new drafts. */
export const CATEGORY_FALLBACK: Record<string, string> = {
  'top-stories': 'police-reports', 'breaking-news': 'police-reports', cybercrime: 'fraud-scams',
  'drug-offences': 'organised-crime', 'domestic-violence': 'violent-crime', 'traffic-offences': 'police-reports',
  'youth-crime': 'violent-crime', 'prison-news': 'court-cases', 'crime-statistics': 'crime-prevention',
  'most-wanted': 'police-reports', 'public-order': 'police-reports', 'crime-and-investigation': 'investigations',
};

/** Normalise any slug/label to an editor category slug (default police-reports). */
export function toEditorCategory(input?: string | null): string {
  const s = (input ?? '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if ((EDITOR_CATEGORY_SLUGS as readonly string[]).includes(s)) return s;
  const byLabel = CATEGORIES.find((c) => c.label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-') === s);
  if (byLabel && (EDITOR_CATEGORY_SLUGS as readonly string[]).includes(byLabel.slug)) return byLabel.slug;
  return CATEGORY_FALLBACK[s] ?? CATEGORY_FALLBACK[byLabel?.slug ?? ''] ?? 'police-reports';
}
