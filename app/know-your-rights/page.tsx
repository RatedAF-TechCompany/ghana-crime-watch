import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { RIGHTS_QUIZ, RIGHTS_SOURCES, RIGHTS_TOPICS, hasRightsContent } from '@/lib/know-your-rights';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Know your rights',
  description: 'Plain-language guides to your rights when dealing with police and courts in Ghana, from primary legal sources.',
  alternates: { canonical: `${BASE_URL}/know-your-rights` },
  robots: hasRightsContent() ? undefined : { index: false, follow: true },
};

export default function KnowYourRights() {
  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-bold">Know your rights</h1>
        <p className="mt-2 font-sans text-sm text-muted-fg">General information only, not legal advice. Each guide cites its primary source.</p>
        <div className="mt-6 space-y-6">
          {RIGHTS_TOPICS.map((t) => (
            <section key={t.slug} id={t.slug} className="rounded-md border p-4">
              <h2 className="font-serif text-xl font-bold">{t.title}</h2>
              {t.body.trim() ? <div className="mt-2 font-body whitespace-pre-line">{t.body}</div>
                : <p className="mt-2 font-sans text-sm italic text-muted-fg">Guide coming soon.</p>}
              {t.sources.length > 0 && <ul className="mt-2 font-sans text-xs">{t.sources.map((s) => <li key={s.label}><a className="underline" href={s.url} rel="noopener" target="_blank">{s.label}</a></li>)}</ul>}
            </section>
          ))}
        </div>
        {RIGHTS_QUIZ.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-2xl font-bold">Quick quiz</h2>
            {RIGHTS_QUIZ.map((q, i) => (
              <details key={i} className="mt-3 rounded-md border p-3 font-sans">
                <summary className="font-semibold">{q.question}</summary>
                <ol className="mt-2 list-[upper-alpha] pl-6 text-sm">{q.options.map((o) => <li key={o}>{o}</li>)}</ol>
                <p className="mt-2 text-sm">Answer: {q.options[q.answerIndex]}. {q.explanation} <span className="text-muted-fg">Source: {q.source}</span></p>
              </details>
            ))}
          </section>
        )}
        <h2 className="mt-8 font-serif text-xl font-bold">Official sources</h2>
        <ul className="mt-2 list-disc pl-6 font-sans text-sm">{RIGHTS_SOURCES.map((s) => <li key={s.url}><a className="underline" href={s.url} rel="noopener" target="_blank">{s.label}</a></li>)}</ul>
      </div>
    </Layout>
  );
}
