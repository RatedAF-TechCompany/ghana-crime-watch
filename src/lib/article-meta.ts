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
  const c = a.content_updated_at, p = a.published_at;
  if (c && p) return new Date(c).getTime() > new Date(p).getTime() ? c : p;
  return c || p || null;
}

// Public timestamps are UK time (Europe/London), labelled GMT or BST as appropriate.
const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
const zoneFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' });
const zoneLabel = (d: Date) => {
  const z = zoneFmt.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  return z === 'GMT' || z === 'UTC' ? 'GMT' : 'BST';
};

export const formatGhanaDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatGhanaTime = (iso: string) => `${timeFmt.format(new Date(iso))} ${zoneLabel(new Date(iso))}`;
/** "Published 3 Nov 2026, 14:05 GMT" */
export const formatPublished = (iso: string) => `Published ${formatGhanaDate(iso)}, ${formatGhanaTime(iso)}`;

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

/** Cut text at a word boundary, never mid-word, and drop dangling punctuation/connectors. */
export function clipAtWord(text: string, max: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max + 1);
  const sp = cut.lastIndexOf(' ');
  cut = sp > max * 0.5 ? cut.slice(0, sp) : t.slice(0, max);
  return cut.replace(/[\s,;:\-–—(]+$/, '').replace(/\s+(and|or|of|the|a|an|in|on|at|to|for|with|by|as|over)$/i, '').replace(/[\s,;:\-–—]+$/, '');
}

/** Page <title> text: a hand-set SEO title wins, unless it is just an auto-truncated copy of the headline. */
export function articleTitleText(a: { title: string; seo_title?: string | null }, max = 70): string {
  const seo = (a.seo_title || '').trim();
  const head = (a.title || '').trim();
  // Use the SEO title only if it still matches the current headline (first 4 words); otherwise the headline
  // has been updated (e.g. new casualty count) and the stale SEO title must not be shown.
  const w = (x: string) => x.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
  if (seo && w(seo) === w(head) && !(head.startsWith(seo) && head.length > seo.length)) return seo;
  return clipAtWord(head, max);
}

/** Registrable domain (gna.org.gh, myjoyonline.com) so two pages from one outlet count once. */
export function outletDomain(url: string): string | null {
  try {
    const parts = new URL(url).hostname.replace(/^www\./, '').toLowerCase().split('.');
    const sld = parts.length >= 3 && /^(com|org|gov|edu|co|net|ac|mil)$/.test(parts[parts.length - 2]) && parts[parts.length - 1].length === 2;
    return parts.slice(sld ? -3 : -2).join('.');
  } catch { return null; }
}

/** Distinct outlets behind a story. Social links and our own domain do not count as independent sources. */
export function independentOutlets(urls: (string | null | undefined)[]): string[] {
  const skip = /^(x\.com|twitter\.com|facebook\.com|fb\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|t\.co|whatsapp\.com|ghanacrimes\.com)$/;
  return [...new Set(urls.filter(Boolean).map((u) => outletDomain(u as string)).filter((d): d is string => !!d && !skip.test(d)))];
}

/**
 * Meta/OG description: complete sentences are used as-is; anything longer than `max`, or a stored
 * seo_description that was hard-cut mid-sentence, is clipped at a word boundary with an ellipsis.
 */
export function metaDescription(seo: string | null | undefined, summary: string | null | undefined, max = 160): string {
  const done = (s: string) => /[.!?…"'”’)]$/.test(s);
  const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
  const a = clean(seo), b = clean(summary);
  let src = a && (done(a) || !b) ? a : b || a;
  if (src.length <= max && done(src)) return src;
  // Stored text that stops mid-word: drop the partial last word before clipping.
  if (src.length <= max && src === a && !done(a)) src = src.replace(/\s+\S*$/, '');
  const clipped = clipAtWord(src, max - 1);
  return clipped ? `${clipped}…` : '';
}
