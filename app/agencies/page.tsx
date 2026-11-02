import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { AGENCIES, getAgencyArticles } from '@/lib/agencies';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'Agencies in the news', description: 'GhanaCrimes coverage of EOCO, the OSP, NACOC, NAIMOS and other agencies.', alternates: { canonical: `${BASE_URL}/agencies` } };

export default async function AgenciesPage() {
  const rows = await Promise.all(AGENCIES.map(async (a) => ({ a, n: (await getAgencyArticles(a)).length })));
  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-bold">Agencies in the news</h1>
        <ul className="mt-6 divide-y">
          {rows.filter((r) => r.n > 0).map(({ a, n }) => (
            <li key={a.slug} className="py-3"><Link href={`/agencies/${a.slug}`} className="font-headline text-lg font-bold hover:text-primary">{a.name}</Link> <span className="font-sans text-sm text-muted-fg">{n} stor{n === 1 ? 'y' : 'ies'}</span></li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
