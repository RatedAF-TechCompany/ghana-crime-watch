import Link from 'next/link';
import { getCourtCases, formatHearing } from '@/lib/court-cases';

/** Hearings in the next 7 days from the court tracker, each with an .ics download. */
export async function ThisWeekInCourt() {
  let rows: Awaited<ReturnType<typeof getCourtCases>>['upcoming'] = [];
  try { rows = (await getCourtCases()).upcoming; } catch { return null; }
  const end = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const week = rows.filter((c) => c.next_hearing && c.next_hearing <= end);
  if (!week.length) return null;
  return (
    <section aria-labelledby="court-week" className="mb-10 rounded-md border border-border px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="court-week" className="font-sans text-xs font-bold uppercase tracking-[0.16em]">This week in court</h2>
        <a href="/courts/this-week.ics" className="font-sans text-xs text-primary underline">Add all to calendar</a>
      </div>
      <ul className="space-y-1.5">
        {week.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-sans text-xs font-bold text-primary">{formatHearing(c.next_hearing!)}</span>
            <Link href={`/courts/cases/${c.slug}`} className="font-headline text-base font-bold hover:text-primary">{c.title}</Link>
            <a href={`/courts/cases/${c.slug}/calendar.ics`} className="font-sans text-[11px] text-muted-fg underline">.ics</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
