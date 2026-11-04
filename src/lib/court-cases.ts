import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export interface CourtCase { id: string; slug: string; title: string; status: string | null; next_hearing: string | null; next_hearing_text: string | null; next_hearing_article_id: string | null; updated_at: string }
export interface CaseArticle { id: string; title: string; category_slug: string; article_slug: string; published_at: string; case_status: string | null; source_url?: string | null; summary: string | null }

const CASE_COLS = 'id, slug, title, status, next_hearing, next_hearing_text, next_hearing_article_id, updated_at';
const ART_COLS = 'id, title, category_slug, article_slug, published_at, case_status, summary';

/** Cases with a sourced next-hearing date, soonest first (today onwards), then recently passed ones. */
export const getCourtCases = cache(async (): Promise<{ upcoming: CourtCase[]; past: CourtCase[] }> => {
  const db = createServerClient() as any;
  const { data, error } = await db.from('court_cases').select(CASE_COLS).eq('is_published', true).order('next_hearing', { ascending: true }).limit(200);
  if (error) throw new Error(`getCourtCases: ${error.message}`);
  const today = new Date(Date.now() + 0).toISOString().slice(0, 10);
  const rows = (data ?? []) as CourtCase[];
  return { upcoming: rows.filter((c) => c.next_hearing && c.next_hearing >= today), past: rows.filter((c) => !c.next_hearing || c.next_hearing < today).reverse() };
});

export const getCourtCase = cache(async (slug: string): Promise<{ c: CourtCase; articles: CaseArticle[] } | null> => {
  const db = createServerClient() as any;
  const { data: c } = await db.from('court_cases').select(CASE_COLS).eq('slug', slug).eq('is_published', true).maybeSingle();
  if (!c) return null;
  const { data: links } = await db.from('court_case_articles').select(`articles(${ART_COLS}, is_published)`).eq('case_id', c.id);
  const articles = ((links ?? []) as any[]).map((l) => l.articles).filter((a) => a?.is_published)
    .sort((a: CaseArticle, b: CaseArticle) => a.published_at.localeCompare(b.published_at)) as CaseArticle[];
  return { c, articles };
});

/** The tracked case an article belongs to, with the case's other published reports. */
export const getCaseForArticle = cache(async (articleId: string) => {
  const db = createServerClient() as any;
  const { data } = await db.from('court_case_articles').select('court_cases(slug, is_published)').eq('article_id', articleId).limit(1);
  const slug = (data?.[0]?.court_cases?.is_published && data[0].court_cases.slug) as string | undefined;
  return slug ? getCourtCase(slug) : null;
});

export function formatHearing(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Accra' });
}
