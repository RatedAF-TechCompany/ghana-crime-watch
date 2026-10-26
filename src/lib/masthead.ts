import { cache, createElement, type ReactNode } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';

const FIELD_KEYS = [
  ['masthead_publisher', 'publisher', 'Publisher'],
  ['masthead_owner', 'owner', 'Owner'],
  ['masthead_editor', 'editor', 'Editor'],
  ['masthead_address', 'address', 'Address'],
  ['masthead_registration', 'registration', 'Registration'],
  ['masthead_founding_date', 'foundingDate', 'Founded'],
  ['contact_email', 'contactEmail', 'Newsroom email'],
] as const;

export type AuthorEntry = { slug: string; name: string; role?: string; bio?: string; same_as?: string[] };
export type Masthead = {
  publisher: string; owner: string; editor: string; address: string; registration: string;
  foundingDate: string; contactEmail: string; sameAs: string[]; authors: AuthorEntry[]; hasAny: boolean;
};

// Owner-authorised masthead (26 Oct 2026). Database values in site_settings override these.
const AUTHORISED: Partial<Masthead> = {
  publisher: 'Ghana Crimes Ltd', address: 'Accra, Ghana', editor: 'GhanaCrimes Newsroom', contactEmail: 'ghanacrimes@gmail.com',
};
export const OFFICIAL_SAME_AS = ['https://x.com/GhanaCrimes'];
export const ORG_ID = `${BASE_URL}/#organization`;
const EMPTY: Masthead = { publisher: '', owner: '', editor: '', address: '', registration: '', foundingDate: '', contactEmail: '', sameAs: [], authors: [], hasAny: false };
const isHttps = (value: unknown): value is string => typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value.trim());
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const decoded = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

function withDefaults(m: Masthead): Masthead {
  for (const [k, v] of Object.entries(AUTHORISED) as [keyof Masthead, string][]) if (!m[k]) (m as any)[k] = v;
  m.sameAs = Array.from(new Set([...OFFICIAL_SAME_AS, ...m.sameAs]));
  m.hasAny = true;
  return m;
}

export const getMasthead = cache(async (): Promise<Masthead> => {
  const keys = [...FIELD_KEYS.map(([key]) => key), 'masthead_same_as', 'authors'];
  const { data, error } = await createServerClient().from('site_settings').select('key, value').in('key', keys);
  if (error) return withDefaults({ ...EMPTY });
  const values = new Map((data ?? []).map((row) => [row.key, decoded(row.value)]));
  const result: Masthead = { ...EMPTY };
  for (const [key, property] of FIELD_KEYS) result[property] = text(values.get(key));
  const sameAs = values.get('masthead_same_as');
  result.sameAs = Array.isArray(sameAs) ? sameAs.filter(isHttps).map((url) => url.trim()) : [];
  const authors = values.get('authors');
  result.authors = Array.isArray(authors) ? authors.flatMap((raw): AuthorEntry[] => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const slug = text(item.slug), name = text(item.name);
    if (!/^[a-z0-9-]+$/.test(slug) || !name) return [];
    const links = Array.isArray(item.same_as) ? item.same_as.filter(isHttps).map((url) => url.trim()) : [];
    return [{ slug, name, ...(text(item.role) ? { role: text(item.role) } : {}), ...(text(item.bio) ? { bio: text(item.bio) } : {}), ...(links.length ? { same_as: links } : {}) }];
  }) : [];
  withDefaults(result);
  result.hasAny = FIELD_KEYS.some(([, property]) => Boolean(result[property])) || result.sameAs.length > 0 || result.authors.length > 0;
  return result;
});

export function MastheadList({ masthead }: { masthead: Masthead }): ReactNode {
  const rows: [string, string, ReactNode][] = FIELD_KEYS.flatMap(([, property, label]) => {
    const value = masthead[property];
    if (!value) return [];
    const content = property === 'contactEmail' ? createElement('a', { href: `mailto:${value}` }, value) : value;
    return [[property, label, content]];
  });
  if (masthead.sameAs.length) rows.push(['sameAs', 'Online', createElement('span', null, ...masthead.sameAs.flatMap((url, index) => [index ? ', ' : '', createElement('a', { href: url, key: url, rel: 'me' }, new URL(url).hostname)]))]);
  if (!rows.length) return null;
  return createElement('dl', null, ...rows.map(([key, label, value]) => createElement('div', { key }, createElement('dt', null, createElement('strong', null, label)), createElement('dd', null, value))));
}

export function newsOrganizationJsonLd(masthead: Masthead) {
  return {
    '@context': 'https://schema.org', '@type': 'NewsMediaOrganization', '@id': ORG_ID, name: 'GhanaCrimes', url: `${BASE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${BASE_URL}/icons/logo-512.png`, width: 512, height: 512 },
    masthead: `${BASE_URL}/masthead`, ownershipFundingInfo: `${BASE_URL}/masthead`,
    publishingPrinciples: `${BASE_URL}/editorial-policy`, correctionsPolicy: `${BASE_URL}/corrections`, ethicsPolicy: `${BASE_URL}/editorial-policy`,
    actionableFeedbackPolicy: `${BASE_URL}/contact`, verificationFactCheckingPolicy: `${BASE_URL}/editorial-policy`, noBylinesPolicy: `${BASE_URL}/authors/ghanacrimes-newsroom`,
    diversityPolicy: `${BASE_URL}/editorial-policy`,
    ...(masthead.publisher ? { parentOrganization: { '@type': 'Organization', name: masthead.publisher } } : {}),
    ...(masthead.contactEmail ? { email: masthead.contactEmail, contactPoint: { '@type': 'ContactPoint', contactType: 'newsroom', email: masthead.contactEmail, url: `${BASE_URL}/contact` } } : {}),
    ...(masthead.address ? { address: { '@type': 'PostalAddress', addressLocality: 'Accra', addressCountry: 'GH' } } : {}),
    ...(masthead.foundingDate ? { foundingDate: masthead.foundingDate } : {}),
    sameAs: masthead.sameAs,
  };
}

export const publisherRef = { '@type': 'NewsMediaOrganization', '@id': ORG_ID, name: 'GhanaCrimes', logo: { '@type': 'ImageObject', url: `${BASE_URL}/icons/logo-512.png`, width: 512, height: 512 } };
