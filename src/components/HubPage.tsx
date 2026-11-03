import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleCardRail } from '@/components/ArticleCardRail';

interface Props {
  kicker: string;
  title: string;
  intro: string;
  note?: string;
  articles: any[];
  emptyMessage?: string;
  related?: { label: string; href: string }[];
}

export function HubPage({ kicker, title, intro, note, articles, emptyMessage, related }: Props) {
  const rail = articles.slice(0, 12);
  const rest = articles.slice(12);
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <p className="card-kicker">{kicker}</p>
      <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl font-sans text-base font-light text-muted-foreground">{intro}</p>
      {note && <p className="mt-2 max-w-3xl font-sans text-xs text-muted-foreground">{note}</p>}
      {articles.length === 0 && emptyMessage && <p className="mt-8 font-sans text-sm text-muted-foreground">{emptyMessage}</p>}
      {rail.length > 0 && (
        <div className="mt-8">
          <ArticleCardRail title="Stories" articles={rail} />
        </div>
      )}
      {rest.length > 0 && (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => <ArticleCard key={a.id} article={a} variant="grid" />)}
        </div>
      )}
      {related && related.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="ox-section-title text-[20px]">More</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {related.map((r) => (
              <Link key={r.href} href={r.href} className="font-sans text-sm text-foreground underline-offset-2 hover:underline">{r.label}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
