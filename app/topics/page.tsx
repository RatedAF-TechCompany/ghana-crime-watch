import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { TOPICS } from '@/lib/hubs';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Crime topics in Ghana',
  description: 'Browse GhanaCrimes coverage by crime and justice topic, including fraud, robbery, corruption and court cases.',
  alternates: { canonical: `${BASE_URL}/topics` },
};

export default function TopicsPage() {
  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Topics</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Crime and justice topics</h1>
        <p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">
          Browse published Ghana crime, policing and court coverage by subject.
        </p>
        <ul className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2">
          {TOPICS.map((topic) => (
            <li key={topic.slug} className="bg-card p-5">
              <Link href={`/topics/${topic.slug}`} className="group block">
                <h2 className="font-serif text-xl font-bold text-foreground group-hover:text-primary">{topic.label}</h2>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">{topic.intro}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}