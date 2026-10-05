import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { EditorialPage } from '@/components/EditorialPage';
import { EXPLAINERS, getExplainer } from '@/lib/explainers';
import { BASE_URL } from '@/lib/utils';

type Params = Promise<{ slug: string }>;
export const dynamicParams = false;

export function generateStaticParams() {
  return EXPLAINERS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const e = getExplainer((await params).slug);
  if (!e) return { title: 'Page not found', robots: { index: false } };
  return { title: e.title, description: e.summary, alternates: { canonical: `${BASE_URL}/explainers/${e.slug}` } };
}

export default async function ExplainerPage({ params }: { params: Params }) {
  const e = getExplainer((await params).slug);
  if (!e) notFound();
  return (
    <Layout>
      <EditorialPage
        kicker="Explainer"
        title={e.title}
        summary={e.summary}
        updated={e.updated}
        disclaimer="This is general information, not legal advice. For advice on a specific situation, speak to a qualified lawyer or the Legal Aid Commission."
        sections={e.sections}
        sources={e.sources}
        related={[...e.related, { label: 'All explainers', href: '/explainers' }]}
      />
    </Layout>
  );
}
