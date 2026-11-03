'use client';
import Link from "next/link";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleCardRail } from "@/components/ArticleCardRail";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/broadcast/SectionHeading";

export default function CategoryView({ categorySlug, articles, page, hasNext }: { categorySlug: string; articles: any[]; page: number; hasNext: boolean }) {

  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No articles in this section yet.</p>
      </div>
    );
  }

  const lead = articles[0];
  const rail = articles.slice(1, 11);
  const rest = articles.slice(11);

  return (
    <div className="space-y-12">
      {lead && <HeroArticle article={lead} />}

      {rail.length > 0 && (
        <ArticleCardRail title="More in this section" articles={rail} />
      )}

      {rest.length > 0 && (
        <>
          <SectionHeading title="More headlines" />
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} variant="grid" />
            ))}
          </div>
        </>
      )}

      <div className="flex justify-center gap-4 pt-4">
        {page > 1 && (
          <Button asChild variant="outline" className="border-foreground/20">
            <Link href={page === 2 ? `/${categorySlug}` : `/${categorySlug}/page/${page - 1}`}>Previous</Link>
          </Button>
        )}
        {hasNext && (
          <Button asChild variant="outline" className="border-foreground/20">
            <Link href={`/${categorySlug}/page/${page + 1}`}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
