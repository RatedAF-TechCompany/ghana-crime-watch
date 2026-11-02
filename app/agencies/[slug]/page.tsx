import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import { getAgency, getAgencyArticles } from '@/lib/agencies';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 1800;
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const a = getAgency((await params).slug);
  if (!a) return {};
  const n = (await getAgencyArticles(a)).length;
  return { title: `${a.short}: latest news and timeline`, description: `GhanaCrimes reports involving the ${a.name}, newest first.`, alternates: { canonical: `${BASE_URL}/agencies/${a.slug}` }, robots: n < 3 ? { index: false } : undefined };
}

export default async function AgencyPage({ params }: { params: P }) {
  const a = getAgency((await params).slug);
  if (!a) notFound();
  const items = await getAgencyArticles(a);
  const byMonth = items.reduce<Record<string, typeof items>>((m, r: any) => {
    const k = new Date(r.published_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Africa/Accra' });
    (m[k] ??= []).push(r); return m;
  }, {});
  return (
    <Layout>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${a.short} news`, url: `${BASE_URL}/agencies/${a.slug}`, about: { '@type': 'GovernmentOrganization', name: a.name, ...(a.site ? { url: a.site } : {}) } }} />
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Link href="/agencies">Agencies</Link></p>
        <h1 className="mt-2 font-serif text-3xl font-bold">{a.name}</h1>
        <p className="mt-2 font-sans text-sm text-muted-fg">{items.length} published GhanaCrimes stor{items.length === 1 ? 'y' : 'ies'} naming {a.short}, built automatically.{a.site && <> Official site: <a href={a.site} rel="noopener" className="underline">{a.site.replace('https://', '')}</a></>}</p>
        {items.length === 0 && <p className="mt-6 font-sans text-sm">No published stories yet.</p>}
        {Object.entries(byMonth).map(([m, list]) => (
          <section key={m} className="mt-6">
            <h2 className="mb-2 font-sans text-xs font-bold uppercase tracking-widest text-muted-fg">{m}</h2>
            <ol className="space-y-3 border-l-2 border-primary/30 pl-4">
              {list.map((r: any) => (
                <li key={r.id}><time className="font-sans text-xs text-muted-fg" dateTime={r.published_at}>{new Date(r.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' })}</time>
                  <Link href={`/${r.category_slug}/${r.article_slug}`} className="block font-headline text-base font-bold hover:text-primary">{r.title}</Link></li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Layout>
  );
}
