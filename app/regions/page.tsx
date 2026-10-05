import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { REGIONS } from '@/lib/hubs';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Crime news by region in Ghana',
  description: 'Browse GhanaCrimes reporting across all 16 regions of Ghana.',
  alternates: { canonical: `${BASE_URL}/regions` },
};

export default function RegionsPage() {
  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Regions</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Crime news across Ghana</h1>
        <p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">
          Browse published crime, police and court reports by region. Stories without a verified place are not assigned to a region.
        </p>
        <ul className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {REGIONS.map((region) => (
            <li key={region.slug} className="bg-card p-5">
              <Link href={`/regions/${region.slug}`} className="group block">
                <h2 className="font-serif text-lg font-bold text-foreground group-hover:text-primary">{region.name} Region</h2>
                <p className="mt-1 font-sans text-xs text-muted-foreground">Regional capital: {region.capital}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}