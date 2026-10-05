import Link from 'next/link';

interface Props {
  kicker: string;
  title: string;
  summary: string;
  updated?: string;
  disclaimer?: string;
  sections: { heading: string; paragraphs: string[] }[];
  sources?: { label: string; href: string }[];
  related?: { label: string; href: string }[];
  children?: React.ReactNode;
}

export function EditorialPage({ kicker, title, summary, updated, disclaimer, sections, sources, related, children }: Props) {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-8">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{kicker}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 font-sans text-lg text-muted-foreground">{summary}</p>
      {updated && (
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          Last updated {new Date(updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. By GhanaCrimes Data Desk.
        </p>
      )}
      {disclaimer && <p className="mt-4 border-l-2 border-primary bg-card p-3 font-sans text-sm text-foreground">{disclaimer}</p>}
      {children}
      {sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-serif text-2xl font-bold text-foreground">{s.heading}</h2>
          {s.paragraphs.map((p, i) => <p key={i} className="mt-3 font-sans text-base leading-relaxed text-foreground">{p}</p>)}
        </section>
      ))}
      {sources && sources.length > 0 && (
        <p className="mt-10 font-sans text-sm text-muted-foreground">
          Sources:{' '}
          {sources.map((s, i) => (
            <span key={s.href}>{i > 0 && ', '}<a href={s.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></span>
          ))}
        </p>
      )}
      {related && related.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">Related</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            {related.map((r) => <Link key={r.href} href={r.href} className="font-sans text-sm text-primary hover:underline">{r.label}</Link>)}
          </div>
        </div>
      )}
    </article>
  );
}
