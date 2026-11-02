import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

/** Recurring agencies. Pages are built automatically from published stories that name them. Official sites only. */
export const AGENCIES = [
  { slug: 'eoco', name: 'Economic and Organised Crime Office (EOCO)', short: 'EOCO', site: 'https://www.eoco.gov.gh', terms: ['EOCO', 'Economic and Organised Crime'] },
  { slug: 'osp', name: 'Office of the Special Prosecutor (OSP)', short: 'OSP', site: 'https://osp.gov.gh', terms: ['Special Prosecutor', 'OSP'] },
  { slug: 'nacoc', name: 'Narcotics Control Commission (NACOC)', short: 'NACOC', site: 'https://www.ncc.gov.gh', terms: ['NACOC', 'Narcotics Control Commission'] },
  { slug: 'naimos', name: 'National Anti-Illegal Mining Operations Secretariat (NAIMOS)', short: 'NAIMOS', site: null, terms: ['NAIMOS'] },
  { slug: 'police-cid', name: 'Ghana Police Service CID', short: 'CID', site: 'https://police.gov.gh', terms: ['CID', 'Criminal Investigations Department'] },
  { slug: 'dovvsu', name: 'Domestic Violence and Victim Support Unit (DOVVSU)', short: 'DOVVSU', site: 'https://police.gov.gh', terms: ['DOVVSU'] },
  { slug: 'csa', name: 'Cyber Security Authority (CSA)', short: 'CSA', site: 'https://csa.gov.gh', terms: ['Cyber Security Authority'] },
  { slug: 'ghana-armed-forces', name: 'Ghana Armed Forces', short: 'GAF', site: 'https://gaf.mil.gh', terms: ['Ghana Armed Forces'] },
] as const;
export type Agency = typeof AGENCIES[number];
export const getAgency = (slug: string) => AGENCIES.find((a) => a.slug === slug) ?? null;

const orFor = (terms: readonly string[]) =>
  terms.flatMap((t) => [`title.ilike.*${t}*`, `summary.ilike.*${t}*`]).join(',');

export const getAgencyArticles = cache(async (a: Agency, limit = 60) => {
  const { data } = await createServerClient().from('articles')
    .select('id, title, summary, category_slug, article_slug, published_at, region')
    .eq('is_published', true).or(orFor(a.terms)).order('published_at', { ascending: false }).limit(limit);
  // "OSP"/"CID" are short; keep only whole-word matches.
  const re = new RegExp(`\\b(${a.terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`);
  return (data ?? []).filter((r: any) => re.test(`${r.title} ${r.summary ?? ''}`));
});
