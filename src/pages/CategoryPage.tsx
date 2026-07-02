import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { AdBanner } from "@/components/AdBanner";
import { SectionHeading } from "@/components/broadcast/SectionHeading";
import { StoryGrid } from "@/components/broadcast/StoryGrid";
import { useState } from "react";
import { getCategoryLabel } from "@/lib/categories";
import { Skeleton } from "@/components/ui/skeleton";

const ARTICLES_PER_PAGE = 17; // 1 lead + 4 + 4 + 8 compact

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [page, setPage] = useState(0);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-cat", categorySlug, page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, body, category_slug, article_slug, published_at, hero_image")
        .eq("is_published", true)
        .eq("category_slug", categorySlug!)
        .order("published_at", { ascending: false })
        .range(page * ARTICLES_PER_PAGE, (page + 1) * ARTICLES_PER_PAGE);
      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug,
  });

  const label = getCategoryLabel(categorySlug!);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="aspect-[16/9] w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <SectionHeading title={label} />
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
      <SectionHeading title={label} />

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
        {page > 0 && (
          <Button variant="outline" onClick={() => setPage(page - 1)} className="border-foreground/20">
            Previous
          </Button>
        )}
        {articles.length >= ARTICLES_PER_PAGE && (
          <Button variant="outline" onClick={() => setPage(page + 1)} className="border-foreground/20">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
