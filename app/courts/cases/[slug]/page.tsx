import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { CaseStatusBadge } from '@/components/CaseStatusBadge';
import { BASE_URL } from '@/lib/utils';
import { formatGhanaDate } from '@/lib/article-meta';
import { caseStatusText } from '@/lib/crime-labels';
import { formatHearing, getCourtCase } from '@/lib/court-cases';

export const revalidate = 1800;
export const dynamicParams = true;
export function generateStaticParams() { return []; }
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getCourtCase((await params).slug);
  if (!data) return { title: 'Case not found', robots: { index: false } };
  return {
    title: `Case tracker: ${data.c.title}`,
    description: `Status, timeline and next hearing (as reported) for: ${data.c.title}.`,
    alternates: { canonical: `${BASE_URL}/courts/cases/${data.c.slug}` },
  };
}

export default async function CourtCasePage({ params }: { params: Params }) {
  const data = await getCourtCase((await params).slug);
  if (!data) notFound();
  const { c, articles } = data;
  const hearingSource = articles.find((a) => a.id === c.next_hearing_article_id);
  const upcoming = c.next_hearing && c.next_hearing >= new Date().toISOString().slice(0, 10);
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Link href="/courts/cases">Court case tracker</Link></p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">{c.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <CaseStatusBadge status={c.status} />
          {caseStatusText(c.status) && <span className="text-muted-foreground">{caseStatusText(c.status)}</span>}
        </div>

        <section className="mt-6 rounded-md border border-border bg-card p-4">
          <h2 className="font-serif text-lg font-bold">{upcoming ? 'Next hearing' : 'Last reported hearing date'}</h2>
          {c.next_hearing ? (
            <>
              <p className="mt-1 text-xl font-bold">{formatHearing(c.next_hearing)}</p>
              {upcoming && <a href={`/courts/cases/${c.slug}/calendar.ics`} className="mt-1 inline-block text-xs text-primary underline">Add to calendar (.ics)</a>}
              {c.next_hearing_text && <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm text-muted-foreground">&ldquo;{c.next_hearing_text}&rdquo;</blockquote>}
              {hearingSource && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Source: <Link className="underline hover:text-primary" href={`/${hearingSource.category_slug}/${hearingSource.article_slug}`}>{hearingSource.title}</Link>
                  {hearingSource.source_url && <> · <a className="underline hover:text-primary" href={hearingSource.source_url} target="_blank" rel="noopener nofollow">original report</a></>}
                </p>
              )}
              {!upcoming && <p className="mt-2 text-xs text-muted-foreground">We have not yet published a report on what happened at this hearing.</p>}
            </>
          ) : <p className="mt-1 text-sm text-muted-foreground">No hearing date has been reported.</p>}
        </section>

        <h2 className="mt-8 font-serif text-xl font-bold">Timeline</h2>
        <ol className="mt-3 space-y-4 border-l border-border pl-4">
          {articles.map((a) => (
            <li key={a.id}>
              <p className="text-xs text-muted-foreground">{formatGhanaDate(a.published_at)} <CaseStatusBadge status={a.case_status} className="ml-1" /></p>
              <Link href={`/${a.category_slug}/${a.article_slug}`} className="font-serif text-base font-bold hover:text-primary">{a.title}</Link>
              {a.summary && <p className="mt-1 text-sm text-foreground/75">{a.summary}</p>}
            </li>
          ))}
        </ol>

        <p className="mt-8 rounded-sm border border-border bg-card p-3 text-xs text-muted-foreground">
          Built only from GhanaCrimes reports linked above, each based on the sources it cites. Hearing dates are as reported and can change;
          for official cause lists see the <a className="underline" href="https://judicial.gov.gh" target="_blank" rel="noopener">Judicial Service of Ghana</a>.
          Anyone charged is presumed innocent until proven guilty. To report an error, use our <Link className="underline" href="/corrections">corrections page</Link>.
        </p>
      </div>
    </Layout>
  );
}
