import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { EXPLAINERS } from '@/lib/explainers';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Explainers',
  description: 'Plain-language guides to how crime, policing and justice work in Ghana.',
  alternates: { canonical: `${BASE_URL}/explainers` },
};

export default function ExplainersIndex() {
  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Explainers</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Understanding crime and justice in Ghana</h1>
        <p className="mt-3 font-sans text-base text-muted-foreground">Short, plain-language guides. They are general information, not legal advice.</p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {EXPLAINERS.map((e) => (
            <li key={e.slug} className="py-5">
              <Link href={`/explainers/${e.slug}`} className="font-serif text-xl font-bold text-foreground hover:text-primary">{e.title}</Link>
              <p className="mt-1 font-sans text-sm text-muted-foreground">{e.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
