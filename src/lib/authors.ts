import type { AuthorEntry } from '@/lib/masthead';

export const DESK_SLUG = 'ghanacrimes-newsroom';

export function isDeskByline(name?: string | null) {
  const value = (name ?? '').trim();
  return !value || /^GhanaCrimes/i.test(value) || /(Desk|Newsroom)$/i.test(value);
}

export function bylineAuthor(name: string | null | undefined, authors: AuthorEntry[]) {
  if (isDeskByline(name)) return { kind: 'desk' as const, href: `/authors/${DESK_SLUG}` };
  const entry = authors.find((author) => author.name.toLocaleLowerCase() === name?.trim().toLocaleLowerCase());
  return entry ? { kind: 'person' as const, entry, href: `/authors/${entry.slug}` } : null;
}