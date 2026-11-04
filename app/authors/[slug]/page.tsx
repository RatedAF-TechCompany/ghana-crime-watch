import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { HubPage } from '@/components/HubPage';
import { JsonLd } from '@/components/JsonLd';
import { BASE_URL } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import { getMasthead } from '@/lib/masthead';
import { DESK_SLUG } from '@/lib/authors';
import { publicRow } from '@/lib/no-outlet';

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

const DESK_DESCRIPTION = 'The GhanaCrimes Newsroom is the central reporting desk of GhanaCrimes. It covers crime, courts, policing, fraud and public safety across all 16 regions of Ghana, working from police and court statements, official records and verified reporting, with every report linked to its sources.';

function DeskAbout({ editor, email }: { editor: string; email: string }) {
  return (
    <section className="container mx-auto max-w-3xl px-4 pb-4 font-sans text-sm leading-relaxed text-foreground">
      <h2 className="font-serif text-2xl font-bold">About the desk</h2>
      <p className="mt-3">{DESK_DESCRIPTION}</p>
      <h3 className="mt-6 font-serif text-xl font-bold">How we report</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Stories start from primary material: Ghana Police Service and court statements, official records, agency releases and on-the-record sources.</li>
        <li>Facts, names, charges and figures are checked against the source before publication, and each report links to where the information came from.</li>
        <li>Everyone accused of a crime is presumed innocent until proven guilty by a court, and we do not identify victims or alleged victims of sexual offences.</li>
        <li>Automated tools help us cover more of Ghana&apos;s crime news; how and where they are used is set out in our <a className="underline" href="/ai-use">AI use policy</a>.</li>
        <li>Errors are corrected promptly and transparently under our <a className="underline" href="/corrections">corrections policy</a>. Full standards are in our <a className="underline" href="/editorial-policy">editorial policy</a>.</li>
      </ul>
      <h3 className="mt-6 font-serif text-xl font-bold">Contact the newsroom</h3>
      <p className="mt-2">
        {editor && <>Editor: {editor}. </>}
        {email ? <>Email <a className="underline" href={`mailto:${email}`}>{email}</a>, </> : null}
        use our <a className="underline" href="/contact">contact page</a>, or send a confidential <a className="underline" href="/tips">news tip</a>. Report corrections via the <a className="underline" href="/corrections">corrections page</a>.
      </p>
    </section>
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getAuthorPage(slug);
  if (!page) return { title: 'Page not found', robots: { index: false } };
  const title = page.entry?.name ?? 'GhanaCrimes Newsroom';
  return { title, description: page.entry?.bio ?? (slug === DESK_SLUG ? DESK_DESCRIPTION : 'Reports published by this author.'), alternates: { canonical: `${BASE_URL}/authors/${slug}` }, ...(page.articles.length || slug === DESK_SLUG ? {} : { robots: { index: false, follow: true } }) };
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getAuthorPage(slug);
  if (!page) notFound();
  const desk = slug === DESK_SLUG;
  const title = page.entry?.name ?? 'GhanaCrimes Newsroom';
  const intro = desk ? 'Reports published under the GhanaCrimes Newsroom, Data Desk and Desk bylines. Each report links to its source and follows our editorial policy.' : (page.entry?.bio ?? 'Reports published by this author.');
  const jsonLd = desk
    ? { '@context': 'https://schema.org', '@type': 'Organization', name: title, url: `${BASE_URL}/authors/${slug}`, description: DESK_DESCRIPTION, ...(page.masthead.contactEmail ? { email: page.masthead.contactEmail } : {}), publishingPrinciples: `${BASE_URL}/editorial-policy`, correctionsPolicy: `${BASE_URL}/corrections`, parentOrganization: { '@type': 'NewsMediaOrganization', name: 'GhanaCrimes', url: BASE_URL } }
    : { '@context': 'https://schema.org', '@type': 'ProfilePage', url: `${BASE_URL}/authors/${slug}`, mainEntity: { '@type': 'Person', name: title, ...(page.entry?.role ? { jobTitle: page.entry.role } : {}), ...(page.entry?.bio ? { description: page.entry.bio } : {}), ...(page.entry?.same_as?.length ? { sameAs: page.entry.same_as } : {}), url: `${BASE_URL}/authors/${slug}` } };
  return <Layout><JsonLd data={jsonLd} /><HubPage kicker="Author" title={title} intro={intro} note={desk && page.masthead.editor ? `Editor: ${page.masthead.editor}` : page.entry?.role} articles={page.articles.map(publicRow)} emptyMessage="No published reports are available for this byline." />{desk && <DeskAbout editor={page.masthead.editor} email={page.masthead.contactEmail} />}</Layout>;
}