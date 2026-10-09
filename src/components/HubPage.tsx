import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';

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
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{kicker}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl font-sans text-base text-muted-foreground">{intro}</p>
      {note && <p className="mt-2 max-w-3xl font-sans text-xs text-muted-foreground">{note}</p>}
      {articles.length === 0 && emptyMessage && <p className="mt-8 font-sans text-sm text-muted-foreground">{emptyMessage}</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => <ArticleCard key={a.id} article={a} variant="grid" />)}
      </div>
      {related && related.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">More</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {related.map((r) => (
              <Link key={r.href} href={r.href} className="font-sans text-sm text-primary hover:underline">{r.label}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
