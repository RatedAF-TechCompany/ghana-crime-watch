import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { HubPage } from '@/components/HubPage';
import { JsonLd } from '@/components/JsonLd';
import { BASE_URL } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import { getMasthead } from '@/lib/masthead';
import { DESK_SLUG } from '@/lib/authors';

export const revalidate = 600;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }
type Params = Promise<{ slug: string }>;
const COLS = 'id, title, summary, body, category_slug, article_slug, published_at, hero_image';

async function getAuthorPage(slug: string) {
  const masthead = await getMasthead();
  const entry = slug === DESK_SLUG ? null : masthead.authors.find((author) => author.slug === slug);
  if (slug !== DESK_SLUG && !entry) return null;
  let query = createServerClient().from('articles').select(COLS).eq('is_published', true);
  query = slug === DESK_SLUG
    ? query.or('author_name.is.null,author_name.ilike.GhanaCrimes%,author_name.ilike.%Desk,author_name.ilike.%Newsroom')
    : query.eq('author_name', entry?.name ?? '');
  const { data, error } = await query.order('published_at', { ascending: false }).limit(30);
  if (error) throw new Error(`getAuthorPage: ${error.message}`);
  return { masthead, entry, articles: data ?? [] };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getAuthorPage(slug);
  if (!page) return { title: 'Page not found', robots: { index: false } };
  const title = page.entry?.name ?? 'GhanaCrimes Newsroom';
  return { title, description: page.entry?.bio ?? 'Reports published by the GhanaCrimes Newsroom.', alternates: { canonical: `${BASE_URL}/authors/${slug}` }, ...(page.articles.length ? {} : { robots: { index: false, follow: true } }) };
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getAuthorPage(slug);
  if (!page) notFound();
  const desk = slug === DESK_SLUG;
  const title = page.entry?.name ?? 'GhanaCrimes Newsroom';
  const intro = desk ? 'Reports published under the GhanaCrimes Newsroom, Data Desk and Desk bylines. Each report links to its source and follows our editorial policy.' : (page.entry?.bio ?? 'Reports published by this author.');
  const jsonLd = desk
    ? { '@context': 'https://schema.org', '@type': 'Organization', name: title, url: `${BASE_URL}/authors/${slug}`, parentOrganization: { '@type': 'NewsMediaOrganization', name: 'GhanaCrimes', url: BASE_URL } }
    : { '@context': 'https://schema.org', '@type': 'ProfilePage', url: `${BASE_URL}/authors/${slug}`, mainEntity: { '@type': 'Person', name: title, ...(page.entry?.role ? { jobTitle: page.entry.role } : {}), ...(page.entry?.bio ? { description: page.entry.bio } : {}), ...(page.entry?.same_as?.length ? { sameAs: page.entry.same_as } : {}), url: `${BASE_URL}/authors/${slug}` } };
  return <Layout><JsonLd data={jsonLd} /><HubPage kicker="Author" title={title} intro={intro} note={desk && page.masthead.editor ? `Editor: ${page.masthead.editor}` : page.entry?.role} articles={page.articles} emptyMessage="No published reports are available for this byline." /></Layout>;
}