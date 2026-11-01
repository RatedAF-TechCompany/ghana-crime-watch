import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { CaseStatusBadge } from '@/components/CaseStatusBadge';
import { BASE_URL } from '@/lib/utils';
import { formatHearing, getCourtCases, type CourtCase } from '@/lib/court-cases';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Court case tracker: upcoming hearings',
  description: 'Criminal cases GhanaCrimes is following, with status and the next hearing date as reported, each linked to its source.',
  alternates: { canonical: `${BASE_URL}/courts/cases` },
};

function CaseList({ rows }: { rows: CourtCase[] }) {
  return (
    <ul className="mt-3 divide-y divide-border border-y border-border">
      {rows.map((c) => (
        <li key={c.id} className="flex gap-4 py-3">
          <div className="w-28 shrink-0 text-xs font-bold tabular-nums text-foreground">{c.next_hearing ? formatHearing(c.next_hearing) : 'No date'}</div>
          <div className="min-w-0">
            <CaseStatusBadge status={c.status} />
            <Link href={`/courts/cases/${c.slug}`} className="mt-1 block font-serif text-base font-bold hover:text-primary">{c.title}</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function CourtCasesPage() {
  const { upcoming, past } = await getCourtCases();
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Link href="/courts">Courts</Link></p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Court case tracker</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cases we have reported on, with the next hearing date only where a published report gives one. Dates are as reported and can change.
          Anyone charged is presumed innocent until proven guilty.
        </p>
        <h2 className="mt-8 font-serif text-xl font-bold">Upcoming hearings</h2>
        {upcoming.length ? <CaseList rows={upcoming} /> : <p className="mt-3 text-sm text-muted-foreground">No upcoming hearing dates have been reported.</p>}
        {past.length > 0 && (<><h2 className="mt-8 font-serif text-xl font-bold">Hearing date passed, awaiting our next report</h2><CaseList rows={past.slice(0, 30)} /></>)}
      </div>
    </Layout>
  );
}
