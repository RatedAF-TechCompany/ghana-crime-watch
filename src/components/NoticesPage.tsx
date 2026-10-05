import Link from 'next/link';
import type { OfficialNotice } from '@/lib/notices';

interface Props {
  kicker: string;
  title: string;
  intro: string;
  notices: OfficialNotice[];
  officialLinks: { label: string; href: string }[];
  emergencyNote?: string;
}

export function NoticesPage({ kicker, title, intro, notices, officialLinks, emergencyNote }: Props) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{kicker}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">{intro}</p>
      {emergencyNote && (
        <p className="mt-4 max-w-3xl border-l-2 border-primary bg-card p-3 font-sans text-sm text-foreground">
          {emergencyNote}
        </p>
      )}

      {notices.length === 0 ? (
        <div className="mt-8 border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-bold text-foreground">No official notices listed right now</h2>
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            We only list people named in public notices issued by the Ghana Police Service or INTERPOL, each linked to the
            original notice. We do not accept or publish names suggested by readers, and we do not crowd-source accusations.
          </p>
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            If you have information about a person in an official notice, contact the police directly on 191 or 18555, or
            submit it through our <Link href="/tips" className="text-primary hover:underline">tips page</Link>. Tips are
            read by editors and are never published as names.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {notices.map((n) => (
            <li key={n.id} className="flex gap-4 border border-border bg-card p-4">
              {n.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.photo_url} alt={`Official notice photo: ${n.person_name}`} className="h-28 w-24 shrink-0 object-cover" />
              )}
              <div>
                <h2 className="font-serif text-lg font-bold text-foreground">{n.person_name}</h2>
                {n.details && (
                  <p className="mt-1 font-sans text-sm text-foreground">
                    <span className="font-semibold">Alleged offence: </span>{n.details}
                  </p>
                )}
                <p className="mt-1 font-sans text-xs text-muted-foreground">Agency: {n.agency}</p>
                <p className="mt-1 font-sans text-xs text-muted-foreground">
                  Source: <a href={n.official_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Official {n.agency} notice</a>
                  {' '}· Notice or warrant date: <time dateTime={n.date_seen}>{new Date(`${n.date_seen}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>
                </p>
                <p className="mt-2 font-sans text-[11px] italic text-muted-foreground">
                  This is an official police notice, not a finding of guilt by GhanaCrimes. The person is presumed innocent unless convicted by a court.
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">Official sources</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          {officialLinks.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-primary hover:underline">{l.label}</a>
          ))}
        </div>
        <p className="mt-4 font-sans text-xs text-muted-foreground">
          Being named in a wanted notice is not a finding of guilt. Everyone is presumed innocent until proven guilty in court.
        </p>
      </div>
    </div>
  );
}
