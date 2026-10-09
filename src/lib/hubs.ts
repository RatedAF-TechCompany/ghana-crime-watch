import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export const REGIONS = [
  { slug: 'greater-accra', name: 'Greater Accra', capital: 'Accra', grid: [4, 6] },
  { slug: 'ashanti', name: 'Ashanti', capital: 'Kumasi', grid: [2, 4] },
  { slug: 'western', name: 'Western', capital: 'Sekondi-Takoradi', grid: [1, 6] },
  { slug: 'western-north', name: 'Western North', capital: 'Sefwi Wiawso', grid: [1, 4] },
  { slug: 'central', name: 'Central', capital: 'Cape Coast', grid: [2, 6] },
  { slug: 'eastern', name: 'Eastern', capital: 'Koforidua', grid: [3, 5] },
  { slug: 'volta', name: 'Volta', capital: 'Ho', grid: [4, 5] },
  { slug: 'oti', name: 'Oti', capital: 'Dambai', grid: [4, 3] },
  { slug: 'northern', name: 'Northern', capital: 'Tamale', grid: [3, 2] },
  { slug: 'savannah', name: 'Savannah', capital: 'Damongo', grid: [2, 2] },
  { slug: 'north-east', name: 'North East', capital: 'Nalerigu', grid: [3, 1] },
  { slug: 'upper-east', name: 'Upper East', capital: 'Bolgatanga', grid: [4, 1] },
  { slug: 'upper-west', name: 'Upper West', capital: 'Wa', grid: [2, 1] },
  { slug: 'bono', name: 'Bono', capital: 'Sunyani', grid: [1, 3] },
  { slug: 'bono-east', name: 'Bono East', capital: 'Techiman', grid: [3, 3] },
  { slug: 'ahafo', name: 'Ahafo', capital: 'Goaso', grid: [2, 3] },
] as const;

export const TOPICS = [
  { slug: 'armed-robbery', label: 'Armed Robbery', terms: ['robbery', 'robber', 'robbed'], intro: 'Reports of robbery and armed robbery across Ghana, including arrests, police operations and court proceedings.' },
  { slug: 'cyber-fraud', label: 'Cyber Fraud', terms: ['cyber', 'fraud', 'scam', 'defraud', 'money laundering'], intro: 'Online scams, cyber fraud, romance scams and financial fraud cases reported in Ghana.' },
  { slug: 'galamsey', label: 'Galamsey', terms: ['galamsey', 'illegal mining', 'illegal miners'], intro: 'Illegal mining arrests, prosecutions and enforcement operations across Ghana.' },
  { slug: 'drug-trafficking', label: 'Drug Trafficking', terms: ['narcotic', 'cocaine', 'cannabis', 'drug traffick', 'NACOC', 'tramadol', 'heroin'], intro: 'Narcotics seizures, drug trafficking arrests and NACOC operations reported in Ghana.' },
  { slug: 'corruption', label: 'Corruption', terms: ['corruption', 'corrupt', 'bribe', 'embezzle', 'misappropriat', 'Special Prosecutor', 'EOCO'], intro: 'Corruption, bribery and embezzlement investigations and cases, including the work of the OSP and EOCO.' },
  { slug: 'road-crashes', label: 'Road Crashes', terms: ['crash', 'accident', 'hit-and-run', 'knockdown'], intro: 'Road crashes in Ghana, with a focus on incidents involving arrests, charges or police investigation.' },
  { slug: 'mob-violence', label: 'Mob Violence', terms: ['mob', 'lynch', 'jungle justice'], intro: 'Mob attacks and lynching incidents reported in Ghana, and the police response to them.' },
  { slug: 'court-cases', label: 'Court Cases', terms: ['court', 'remand', 'sentenced', 'convicted', 'acquitted', 'judge'], intro: 'Court hearings, remands, judgments and sentences in criminal cases across Ghana.' },
] as const;

export type Topic = typeof TOPICS[number];

const LIST = 'id, title, summary, category_slug, article_slug, published_at, hero_image, region';

const GHANA_COURT_SIGNAL = /\b(?:ghana|ghanaian|accra|tema|kasoa|kumasi|tamale|cape coast|takoradi|sekondi|koforidua|ho|wa|bolgatanga|sunyani|techiman|damongo|dambai|nalerigu|goaso|sefwi wiawso|ghana police|judicial service of ghana|ghana attorney[- ]general|office of the special prosecutor|eoco|nacoc|chraj|ghana immigration|ghana prisons|supreme court of ghana)\b/i;

export const getRegion = (slug: string) => REGIONS.find((r) => r.slug === slug) ?? null;
export const getTopic = (slug: string) => TOPICS.find((t) => t.slug === slug) ?? null;

function topicFilter(t: Topic) {
  return t.terms.map((x) => `title.ilike.%${x}%`).join(',');
}

export const getRegionArticles = cache(async (name: string, limit = 30) => {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('articles').select(LIST).eq('is_published', true).eq('region', name)
    .order('published_at', { ascending: false }).limit(limit);
  if (error) { console.error(`getRegionArticles: ${error.message}`); return []; }
  return data ?? [];
});

export const getTopicArticles = cache(async (slug: string, limit = 30) => {
  const t = getTopic(slug);
  if (!t) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase.from('articles').select(LIST).eq('is_published', true).or(topicFilter(t))
    .order('published_at', { ascending: false }).limit(limit);
  if (error) { console.error(`getTopicArticles: ${error.message}`); return []; }
  return data ?? [];
});

/** Court coverage must carry a Ghana place, court or agency signal. */
export const getGhanaCourtArticles = cache(async (limit = 30) => {
  // Same source as the /court-cases section, so /courts is never empty while that section has stories.
  const supabase = createServerClient();
  const { data: section, error } = await supabase.from('articles').select(LIST).eq('is_published', true)
    .eq('category_slug', 'court-cases').order('published_at', { ascending: false }).limit(limit);
  if (error) { console.error(`getGhanaCourtArticles: ${error.message}`); return []; }
  const candidates = await getTopicArticles('court-cases', Math.max(limit * 4, 120));
  const extra = candidates.filter((article) => Boolean(article.region) || GHANA_COURT_SIGNAL.test(`${article.title ?? ''} ${article.summary ?? ''}`));
  const seen = new Set<string>();
  return [...(section ?? []), ...extra]
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, limit);
});

/** Counts of published stories (not incidents) tagged to each region, optionally since a date. */
export const getRegionCounts = cache(async (sinceIso?: string) => {
  const supabase = createServerClient();
  const rows = await Promise.all(REGIONS.map(async (r) => {
    let q = supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('region', r.name);
    if (sinceIso) q = q.gte('published_at', sinceIso);
    const { count } = await q;
    return { ...r, count: count ?? 0 };
  }));
  return rows;
});

export const getTopicCounts = cache(async (sinceIso?: string) => {
  const supabase = createServerClient();
  return Promise.all(TOPICS.map(async (t) => {
    let q = supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true).or(topicFilter(t));
    if (sinceIso) q = q.gte('published_at', sinceIso);
    const { count } = await q;
    return { slug: t.slug, label: t.label, count: count ?? 0 };
  }));
});
