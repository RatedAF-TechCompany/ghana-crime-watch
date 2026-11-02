import type { CourtCase } from '@/lib/court-cases';
import { BASE_URL } from '@/lib/utils';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (l: string) => l.length <= 74 ? l : l.match(/.{1,74}/g)!.join('\r\n ');

/** All-day VEVENTs for tracked hearings (time of day is not published by courts). */
export function courtIcs(cases: CourtCase[], name = 'GhanaCrimes court hearings') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = cases.filter((c) => c.next_hearing).map((c) => {
    const d = c.next_hearing!.replace(/-/g, '');
    const next = new Date(`${c.next_hearing}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    const url = `${BASE_URL}/courts/cases/${c.slug}`;
    return ['BEGIN:VEVENT', `UID:${c.id}-${d}@ghanacrimes.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${esc(`Court: ${c.title}`)}`, `DESCRIPTION:${esc(`${c.next_hearing_text ?? ''}\n${url}`)}`, `URL:${url}`, 'END:VEVENT'].map(fold).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GhanaCrimes//Court tracker//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(name)}`, ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
export const icsResponse = (body: string, file: string) => new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'public, max-age=1800' } });
