import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import {
  WEEKDAYS,
  archiveDayPath,
  archiveMonthPath,
  archivePathFromKey,
  daysInMonth,
  formatArchiveDay,
  formatArchiveMonth,
  mondayIndex,
  monthName,
  shiftMonth,
  shiftYmd,
  storyCountLabel,
  ymdKey,
  type ArchiveArticle,
  type ArchiveDayCount,
  type ArchiveMonthGroup,
} from '@/lib/archive';

export function ArchiveBreadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  const all = [{ href: '/', label: 'Home' }, { href: '/archive', label: 'Archive' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mb-4 font-sans text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((item, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {last || !item.href ? (
                <span className={last ? 'text-foreground' : undefined} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ArchiveIntro({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mb-8 border-b border-border pb-5">
      <p className="card-kicker">{kicker}</p>
      <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">{lede}</p>
    </header>
  );
}

export function ArchiveIndex({ groups, total }: { groups: ArchiveMonthGroup[]; total: number }) {
  return (
    <div className="mx-auto max-w-3xl">
      <ArchiveBreadcrumb items={[]} />
      <ArchiveIntro
        kicker="Archive"
        title="News archive"
        lede={
          total
            ? `${storyCountLabel(total)} published so far, grouped by the day they went live. Dates are Ghana time (Africa/Accra, GMT).`
            : 'Stories will appear here on the day they are published. Dates are Ghana time (Africa/Accra, GMT).'
        }
      />
      {groups.length === 0 ? (
        <p className="font-sans text-base text-muted-foreground">No stories have been published yet.</p>
      ) : (
        groups.map((year) => (
          <section key={year.year} className="mb-12" aria-labelledby={`archive-year-${year.year}`}>
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id={`archive-year-${year.year}`} className="font-headline text-2xl font-bold">
                {year.year}
              </h2>
              <p className="font-sans text-sm text-muted-foreground">{storyCountLabel(year.count)}</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {year.months.map((month) => (
                <li key={month.month}>
                  <Link
                    href={archiveMonthPath(year.year, month.month)}
                    className="flex items-baseline justify-between gap-4 border border-border px-4 py-4 transition-colors hover:border-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffef00]"
                  >
                    <span className="font-headline text-xl font-bold">{monthName(month.month)}</span>
                    <span className="shrink-0 font-sans text-sm text-muted-foreground">{storyCountLabel(month.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

export function ArchiveMonth({
  y,
  m,
  days,
  todayKey,
  firstKey,
}: {
  y: number;
  m: number;
  days: ArchiveDayCount[];
  todayKey: string;
  firstKey: string;
}) {
  const byDay = new Map(days.map((day) => [Number(day.date.slice(8, 10)), day]));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const label = formatArchiveMonth(y, m);
  const lead = mondayIndex(y, m, 1);
  const count = daysInMonth(y, m);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prev = shiftMonth(y, m, -1);
  const next = shiftMonth(y, m, 1);
  const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
  const firstMonth = (firstKey || todayKey).slice(0, 7);
  const prevOk = monthKey(prev.y, prev.m) >= firstMonth;
  const nextOk = monthKey(next.y, next.m) <= todayKey.slice(0, 7);
  const listed = [...days].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl">
      <ArchiveBreadcrumb items={[{ label }]} />
      <ArchiveIntro
        kicker="Archive"
        title={label}
        lede={
          total
            ? `${storyCountLabel(total)} published in ${label}. Choose a date to read that day's reports. Dates are Ghana time (GMT).`
            : `No stories were published in ${label}. Dates are Ghana time (GMT).`
        }
      />
      <nav aria-label="Nearby months" className="mb-6 grid grid-cols-2 gap-3 font-sans text-sm sm:grid-cols-3">
        {prevOk ? (
          <Link href={archiveMonthPath(prev.y, prev.m)} className="hover:underline">
            ← {formatArchiveMonth(prev.y, prev.m)}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/archive" className="hidden text-center font-semibold hover:underline sm:block">
          All years
        </Link>
        {nextOk ? (
          <Link href={archiveMonthPath(next.y, next.m)} className="text-right hover:underline">
            {formatArchiveMonth(next.y, next.m)} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <table className="w-full border-collapse">
        <caption className="sr-only">{label}. Days with stories are links.</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col" aria-label={day} className="pb-2 font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                <span aria-hidden="true" className="sm:hidden">{day.slice(0, 1)}</span>
                <span aria-hidden="true" className="hidden sm:inline">{day}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (!day) return <td key={di} />;
                const hit = byDay.get(day);
                const key = ymdKey(y, m, day);
                const isToday = key === todayKey;
                return (
                  <td key={di} className="p-0.5 align-top sm:p-1">
                    {hit ? (
                      <Link
                        href={archiveDayPath(y, m, day)}
                        aria-label={`${formatArchiveDay(y, m, day)}, ${storyCountLabel(hit.count)}`}
                        aria-current={isToday ? 'date' : undefined}
                        className="flex min-h-[3.25rem] flex-col items-center justify-center rounded-sm bg-[#141414] px-0.5 text-white hover:bg-[#ffef00] hover:text-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffef00] sm:min-h-16"
                      >
                        <span className="font-headline text-base font-bold leading-none sm:text-lg">{day}</span>
                        <span className="mt-1 font-sans text-[10px] leading-none tabular-nums sm:text-[11px]">{hit.count}</span>
                      </Link>
                    ) : (
                      <div
                        className={`flex min-h-[3.25rem] items-center justify-center font-headline text-base text-muted-foreground/70 sm:min-h-16 sm:text-lg ${isToday ? 'rounded-sm ring-2 ring-[#ffef00]' : ''}`}
                      >
                        <span>{day}</span>
                        {isToday && <span className="sr-only"> (today)</span>}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {listed.length > 0 ? (
        <>
          <h2 className="mb-2 mt-10 font-headline text-xl font-bold">Days with stories</h2>
          <ul className="divide-y divide-border border-y border-border">
            {listed.map((day) => {
              const d = Number(day.date.slice(8, 10));
              return (
                <li key={day.date}>
                  <Link
                    href={archiveDayPath(y, m, d)}
                    className="flex items-baseline justify-between gap-4 py-3 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffef00]"
                  >
                    <span className="font-headline text-lg font-bold">{formatArchiveDay(y, m, d)}</span>
                    <span className="shrink-0 font-sans text-sm text-muted-foreground">{storyCountLabel(day.count)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-8 font-sans text-base text-muted-foreground">No stories were published in {label}.</p>
      )}
    </div>
  );
}

function dayLinkLabel(current: string, other: string, dir: 'prev' | 'next') {
  const [y, m, d] = current.split('-').map(Number);
  const step = shiftYmd(y, m, d, dir === 'prev' ? -1 : 1);
  const adjacent = ymdKey(step.y, step.m, step.d) === other;
  if (adjacent) return dir === 'prev' ? 'Previous day' : 'Next day';
  return dir === 'prev' ? 'Previous stories' : 'Next stories';
}

function DayJump({
  current,
  prev,
  next,
  monthHref,
  monthLabel,
}: {
  current: string;
  prev: string | null;
  next: string | null;
  monthHref: string;
  monthLabel: string;
}) {
  const end = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return formatArchiveDay(y, m, d);
  };
  return (
    <nav aria-label="Nearby days" className="flex flex-col gap-4 border-y border-border py-4 font-sans text-sm sm:flex-row sm:items-center sm:justify-between">
      {prev ? (
        <Link href={archivePathFromKey(prev)} rel="prev" className="hover:underline sm:max-w-[34%]">
          <span className="block text-muted-foreground">{dayLinkLabel(current, prev, 'prev')}</span>
          <span className="font-semibold">{end(prev)}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      <Link href={monthHref} className="font-semibold hover:underline sm:text-center">
        {monthLabel}
      </Link>
      {next ? (
        <Link href={archivePathFromKey(next)} rel="next" className="hover:underline sm:max-w-[34%] sm:text-right">
          <span className="block text-muted-foreground">{dayLinkLabel(current, next, 'next')}</span>
          <span className="font-semibold">{end(next)}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
    </nav>
  );
}

export function ArchiveDay({
  y,
  m,
  d,
  articles,
  prev,
  next,
}: {
  y: number;
  m: number;
  d: number;
  articles: ArchiveArticle[];
  prev: string | null;
  next: string | null;
}) {
  const label = formatArchiveDay(y, m, d);
  const monthLabel = formatArchiveMonth(y, m);
  const jump = {
    current: ymdKey(y, m, d),
    prev,
    next,
    monthHref: archiveMonthPath(y, m),
    monthLabel,
  };
  return (
    <div className="mx-auto max-w-3xl">
      <ArchiveBreadcrumb items={[{ href: archiveMonthPath(y, m), label: monthLabel }, { label }]} />
      <ArchiveIntro
        kicker="Archive"
        title={label}
        lede={
          articles.length
            ? `${storyCountLabel(articles.length)} published on ${label}, newest first. Everyone charged is presumed innocent unless a court finds otherwise.`
            : `No stories were published on ${label}.`
        }
      />
      <DayJump {...jump} />
      {articles.length === 0 ? (
        <p className="py-10 text-center font-sans text-base text-muted-foreground">
          Nothing was published on this date.{' '}
          <Link href={archiveMonthPath(y, m)} className="font-semibold text-foreground underline underline-offset-2">
            See {monthLabel}
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 space-y-8">
          {articles.map((article) => (
            <li key={article.id} className="border-b border-border pb-8 last:border-b-0">
              <ArticleCard article={article} variant="list-item" />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        <DayJump {...jump} />
      </div>
    </div>
  );
}
