import { BASE_URL } from '@/lib/utils';
import { isSelfHostedImage } from '@/lib/article-image';
import { REGIONS, TOPICS } from '@/lib/hubs';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 675;

/** Social image: self-hosted hero through the proxy, otherwise a generated headline card. Never /og-image.png. */
export function articleSocialImage(article: { id: string; hero_image?: string | null; content_updated_at?: string | null }) {
  const hero = article.hero_image;
  if (isSelfHostedImage(hero) && hero?.startsWith('http')) {
    return { url: `${BASE_URL}/api/og-image?url=${encodeURIComponent(hero)}`, generated: false };
  }
  const v = article.content_updated_at ? `?v=${new Date(article.content_updated_at).getTime()}` : '';
  return { url: `${BASE_URL}/api/og/${article.id}${v}`, generated: true };
}

export const hubSocialImage = (key: string) => `${BASE_URL}/api/og/${key}`;

export function articleModified(a: { content_updated_at?: string | null; published_at?: string | null }) {
  return a.content_updated_at || a.published_at || null;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Accra', hour: '2-digit', minute: '2-digit', hour12: false });

export const formatGhanaDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatGhanaTime = (iso: string) => `${timeFmt.format(new Date(iso))} GMT`;

/** "Published 5 Oct 2026, 11:30 GMT", "Updated 14:05 GMT" (date added if a different day). Updated is null when equal. */
export function publishedUpdatedLabels(publishedIso: string, updatedIso?: string | null) {
  const published = `Published ${formatGhanaDate(publishedIso)}, ${formatGhanaTime(publishedIso)}`;
  if (!updatedIso) return { published, updated: null as string | null };
  const p = new Date(publishedIso).getTime();
  const u = new Date(updatedIso).getTime();
  if (u - p < 60_000) return { published, updated: null };
  const sameDay = formatGhanaDate(publishedIso) === formatGhanaDate(updatedIso);
  const updated = `Updated ${sameDay ? '' : `${formatGhanaDate(updatedIso)}, `}${formatGhanaTime(updatedIso)}`;
  return { published, updated };
}

export function topicForText(text: string) {
  const t = text.toLowerCase();
  return TOPICS.find((x) => x.terms.some((term) => t.includes(term))) ?? null;
}

export function regionForName(name?: string | null) {
  if (!name) return null;
  const n = name.replace(/\s+region$/i, '').trim().toLowerCase();
  return REGIONS.find((r) => r.name.toLowerCase() === n) ?? null;
}

/** Threads are indexable only with 3+ updates and no test slug. */
export function isIndexableThread(slug: string, updateCount: number) {
  return updateCount >= 3 && !/qa-test|-test-/i.test(slug);
}
