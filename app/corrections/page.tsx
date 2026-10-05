import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { SubmissionForm } from '@/components/SubmissionForm';
import { BASE_URL } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import { formatGhanaDate } from '@/lib/article-meta';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Corrections',
  description: 'How GhanaCrimes corrects errors, and how to request a correction.',
  alternates: { canonical: `${BASE_URL}/corrections` },
};

export default async function CorrectionsPage() {
  const supabase = createServerClient();
  const { data: log } = await supabase
    .from('corrections')
    .select('id, note, created_at, articles(title, category_slug, article_slug, is_published)')
    .order('created_at', { ascending: false })
    .limit(200);
  const entries = (log ?? []) as any[];
  return (
    <Layout>
      <StaticPage title="Corrections" intro="We aim to be accurate. When we are not, we correct the record.">
        <h2>Our approach</h2>
        <ul>
          <li>We review every correction request.</li>
          <li>If a report contains an error of fact, we correct the article.</li>
          <li>For significant errors, we add a note to the article explaining what was changed.</li>
          <li>If a report identifies someone it should not, we remove the details or the article.</li>
        </ul>
        <p>Read more in our <Link href="/editorial-policy">Editorial Policy</Link>.</p>
        <h2>Corrections log</h2>
        {entries.length === 0 ? (
          <p>No corrections have been logged yet.</p>
        ) : (
          <ul>
            {entries.map((c) => (
              <li key={c.id}>
                <strong>{formatGhanaDate(c.created_at)}</strong>
                {c.articles?.is_published ? (
                  <> · <a href={`/${c.articles.category_slug}/${c.articles.article_slug}`}>{c.articles.title}</a></>
                ) : c.articles?.title ? <> · {c.articles.title}</> : null}
                : {c.note}
              </li>
            ))}
          </ul>
        )}
        <h2>Request a correction</h2>
        <Suspense>
          <SubmissionForm
            table="correction_requests"
            submitLabel="Send correction request"
            successText="Thank you. Your correction request has been sent to the editors for review."
            fields={[
              { name: 'article_url', label: 'Article link', max: 500, fromQuery: 'article', placeholder: 'https://www.ghanacrimes.com/...' },
              { name: 'details', label: 'What is wrong, and what is correct?', type: 'textarea', required: true, min: 10, max: 5000 },
              { name: 'name', label: 'Your name', max: 120 },
              { name: 'email', label: 'Email', type: 'email', max: 255 },
            ]}
          />
        </Suspense>
      </StaticPage>
    </Layout>
  );
}
