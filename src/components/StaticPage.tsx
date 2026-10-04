import type { ReactNode } from 'react';

export function StaticPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 border-b-2 border-primary pb-6">
        <h1 className="font-headline text-3xl font-bold leading-tight text-foreground sm:text-4xl">{title}</h1>
        {intro && <p className="mt-4 font-body text-lg leading-relaxed text-muted-fg">{intro}</p>}
        {updated && <p className="mt-3 font-sans text-xs uppercase tracking-[0.14em] text-muted-fg">Last updated {updated}</p>}
      </header>
      <div className="static-prose space-y-5 font-body text-[17px] leading-[1.7] text-foreground [&_h2]:mt-10 [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_a]:text-primary [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
