import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ARTICLES_PER_PAGE = 10;

export default function Index() {
  const [page, setPage] = useState(0);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, body, category_slug, article_slug, published_at, hero_image")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(page * ARTICLES_PER_PAGE, (page + 1) * ARTICLES_PER_PAGE);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2 border-b border-border py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold">No Articles Yet</h2>
        <p className="text-muted-foreground">Check back soon for crime news updates.</p>
      </div>
    );
  }

  const [heroArticle, ...restArticles] = articles;

  return (
    <div>
      {heroArticle && <HeroArticle article={heroArticle} />}
      
      <div className="space-y-0">
        {restArticles.map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            showImage={(index + 2) % 5 === 0}
          />
        ))}
      </div>

      {articles.length === ARTICLES_PER_PAGE + 1 && (
        <div className="mt-8 flex justify-center gap-4">
          {page > 0 && (
            <Button variant="outline" onClick={() => setPage(page - 1)}>
              Previous
            </Button>
          )}
          {articles.length === ARTICLES_PER_PAGE + 1 && (
            <Button variant="outline" onClick={() => setPage(page + 1)}>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
