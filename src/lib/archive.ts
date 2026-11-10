import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

/** Publication dates are the calendar day in Ghana (Africa/Accra, GMT, no daylight saving). */
export const ARCHIVE_TZ = 'Africa/Accra';
const MIN_YEAR = 2000;

export type ArchiveDayCount = {
  date: string;
  count: number;
  lastPublishedAt: string | null;
};

export type ArchiveArticle = {
  id: string;
  title: string;
  summary: string | null;
  category_slug: string;
  article_slug: string;
  published_at: string;
  hero_image: string | null;
};

export type ArchiveMonthGroup = {
  year: number;
  count: number;
  months: { month: number; count: number; lastPublishedAt: string | null }[];
};

const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function storyCountLabel(n: number) {
  return `${n} ${n === 1 ? 'story' : 'stories'}`;
}

export function ymdKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function archiveMonthPath(y: number, m: number) {
  return `/archive/${y}/${String(m).padStart(2, '0')}`;
}

export function archiveDayPath(y: number, m: number, d: number) {
  return `/archive/${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

export function archivePathFromKey(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return archiveDayPath(y, m, d);
}

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monday = 0, matching the archive calendar. */
export function mondayIndex(y: number, m: number, d: number) {
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function shiftYmd(y: number, m: number, d: number, delta: number) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function shiftMonth(y: number, m: number, delta: number) {
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

export function formatArchiveMonth(y: number, m: number) {
  return MONTH_FORMAT.format(new Date(Date.UTC(y, m - 1, 1)));
}

export function formatArchiveDay(y: number, m: number, d: number) {
  return DAY_FORMAT.format(new Date(Date.UTC(y, m - 1, d)));
}

export function monthName(m: number) {
  return MONTH_FORMAT.format(new Date(Date.UTC(2000, m - 1, 1))).replace(/ \d+$/, '');
}

function wallClock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ARCHIVE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: n('year'), m: n('month'), d: n('day'), hh: n('hour'), mm: n('minute'), ss: n('second') };
}

/** UTC instant of 00:00:00 on this calendar date in Africa/Accra. */
export function accraDayStart(y: number, m: number, d: number): Date {
  const want = Date.UTC(y, m - 1, d, 0, 0, 0);
  let utc = want;
  for (let i = 0; i < 4; i++) {
    const w = wallClock(new Date(utc));
    const got = Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm, w.ss);
    if (got === want) return new Date(utc);
    utc -= got - want;
  }
  return new Date(utc);
}

export function accraDayRange(y: number, m: number, d: number) {
  const start = accraDayStart(y, m, d);
  const next = shiftYmd(y, m, d, 1);
  const end = accraDayStart(next.y, next.m, next.d);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function accraToday(now = new Date()) {
  const w = wallClock(now);
  return { y: w.y, m: w.m, d: w.d, key: ymdKey(w.y, w.m, w.d) };
}

export function accraDateKey(iso: string) {
  const w = wallClock(new Date(iso));
  return ymdKey(w.y, w.m, w.d);
}

function isMissingCalendarFn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const msg = `${error.message ?? ''}`.toLowerCase();
  return error.code === 'PGRST202' || msg.includes('could not find the function');
}

function asDayCounts(data: unknown): ArchiveDayCount[] {
  const raw = typeof data === 'string' ? JSON.parse(data) : data;
  if (!Array.isArray(raw)) return [];
  const days: ArchiveDayCount[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const date = String((row as { date?: unknown }).date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const count = Number((row as { count?: unknown }).count);
    const last = (row as { last_published_at?: unknown }).last_published_at;
    days.push({
      date,
      count: Number.isFinite(count) ? count : 0,
      lastPublishedAt: typeof last === 'string' ? last : null,
    });
  }
  days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return days;
}

async function calendarFromTimestamps(): Promise<ArchiveDayCount[]> {
  const supabase = createServerClient();
  const map = new Map<string, ArchiveDayCount>();
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, published_at')
      .eq('is_published', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .range(off, off + 999);
    if (error) throw new Error(`archive calendar: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) {
      if (!row.published_at) continue;
      const date = accraDateKey(row.published_at);
      const prev = map.get(date);
      if (prev) {
        prev.count += 1;
        if (row.published_at > (prev.lastPublishedAt ?? '')) prev.lastPublishedAt = row.published_at;
      } else {
        map.set(date, { date, count: 1, lastPublishedAt: row.published_at });
      }
    }
    if (rows.length < 1000) break;
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** One grouped read of publication days. Falls back to paging timestamps until the migration is applied. */
export const getArchiveCalendar = cache(async (): Promise<ArchiveDayCount[]> => {
  const supabase = createServerClient();
  const { data, error } = await (supabase as any).rpc('archive_calendar');
  if (error) {
    if (isMissingCalendarFn(error)) return calendarFromTimestamps();
    throw new Error(`archive calendar: ${error.message}`);
  }
  return asDayCounts(data);
});

export function groupArchiveMonths(days: ArchiveDayCount[]): ArchiveMonthGroup[] {
  const years = new Map<number, ArchiveMonthGroup>();
  const chronological = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const day of chronological) {
    const y = Number(day.date.slice(0, 4));
    const m = Number(day.date.slice(5, 7));
    let year = years.get(y);
    if (!year) {
      year = { year: y, count: 0, months: [] };
      years.set(y, year);
    }
    year.count += day.count;
    let month = year.months.find((item) => item.month === m);
    if (!month) {
      month = { month: m, count: 0, lastPublishedAt: null };
      year.months.push(month);
    }
    month.count += day.count;
    if (day.lastPublishedAt && (!month.lastPublishedAt || day.lastPublishedAt > month.lastPublishedAt)) {
      month.lastPublishedAt = day.lastPublishedAt;
    }
  }
  return [...years.values()].sort((a, b) => b.year - a.year);
}

export function daysInMonthCounts(days: ArchiveDayCount[], y: number, m: number) {
  const prefix = `${y}-${String(m).padStart(2, '0')}-`;
  return days.filter((day) => day.date.startsWith(prefix));
}

/** Previous and next publication days, newest-adjacent, never a chain of empty dates. */
export function neighborPublishedDays(date: string, days: ArchiveDayCount[]) {
  const keys = days.map((day) => day.date).sort();
  const today = accraToday().key;
  const prev = [...keys].reverse().find((key) => key < date) ?? null;
  const nextKey = keys.find((key) => key > date && key <= today) ?? null;
  return { prev, next: nextKey };
}

const DAY_COLUMNS = 'id, title, summary, category_slug, article_slug, published_at, hero_image';

export const getDayArticles = cache(async (y: number, m: number, d: number): Promise<ArchiveArticle[]> => {
  const { start, end } = accraDayRange(y, m, d);
  const supabase = createServerClient();
  const rows: ArchiveArticle[] = [];
  for (let off = 0; off < 5000; off += 1000) {
    const { data, error } = await supabase
      .from('articles')
      .select(DAY_COLUMNS)
      .eq('is_published', true)
      .gte('published_at', start)
      .lt('published_at', end)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .range(off, off + 999);
    if (error) throw new Error(`archive day: ${error.message}`);
    const page = (data ?? []) as ArchiveArticle[];
    rows.push(...page.filter((article) => article.published_at));
    if (page.length < 1000) break;
  }
  return rows;
});

function assertYearMonth(year: string, month: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) notFound();
  const y = Number(year);
  const m = Number(month);
  const today = accraToday();
  if (!Number.isInteger(y) || !Number.isInteger(m) || y < MIN_YEAR || y > today.y || m < 1 || m > 12) notFound();
  if (y === today.y && m > today.m) notFound();
  return { y, m, today };
}

export function parseArchiveMonth(year: string, month: string) {
  const { y, m } = assertYearMonth(year, month);
  if (month !== String(m).padStart(2, '0')) permanentRedirect(archiveMonthPath(y, m));
  return { y, m };
}

export function parseArchiveDay(year: string, month: string, day: string) {
  const { y, m, today } = assertYearMonth(year, month);
  if (!/^\d{1,2}$/.test(day)) notFound();
  const d = Number(day);
  if (!Number.isInteger(d) || d < 1 || d > daysInMonth(y, m)) notFound();
  if (ymdKey(y, m, d) > today.key) notFound();
  if (month !== String(m).padStart(2, '0') || day !== String(d).padStart(2, '0')) {
    permanentRedirect(archiveDayPath(y, m, d));
  }
  return { y, m, d };
}
