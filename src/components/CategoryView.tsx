'use client';
import Link from "next/link";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { AdBanner } from "@/components/AdBanner";
import { SectionHeading } from "@/components/broadcast/SectionHeading";
import { StoryGrid } from "@/components/broadcast/StoryGrid";
export default function CategoryView({ categorySlug, articles, page, hasNext }: { categorySlug: string; articles: any[]; page: number; hasNext: boolean }) {

  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No articles in this section yet.</p>
      </div>
    );
  }

  const lead = articles[0];
  const grid1 = articles.slice(1, 5);
  const grid2 = articles.slice(5, 9);
  const rest = articles.slice(9);

  return (
    <div className="space-y-10">
      {lead && <HeroArticle article={lead} />}

      <div className="mx-auto max-w-3xl">
        <AdBanner slotId={4} probability={0.5} />
      </div>

      {grid1.length > 0 && (
        <StoryGrid>
          {grid1.map((a) => (
            <ArticleCard key={a.id} article={a} variant="grid" />
          ))}
        </StoryGrid>
      )}

      {grid2.length > 0 && (
        <>
          <SectionHeading title="More in this section" />
          <StoryGrid>
            {grid2.map((a) => (
              <ArticleCard key={a.id} article={a} variant="grid" />
            ))}
          </StoryGrid>
        </>
      )}

      {rest.length > 0 && (
        <>
          <SectionHeading title="More Headlines" />
          <div>
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
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
