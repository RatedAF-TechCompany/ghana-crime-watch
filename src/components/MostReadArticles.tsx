import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  view_count: number;
}

export function MostReadArticles() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["most-read-articles"],
    queryFn: async () => {
      // Get top 5 articles by view count
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count")
        .eq("is_published", true)
        .order("view_count", { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // If no articles with views, fall back to most recent
      if (!data || data.length === 0 || data.every(a => (a.view_count || 0) === 0)) {
        const { data: recentData, error: recentError } = await supabase
          .from("articles")
          .select("id, title, category_slug, article_slug, view_count")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(5);
        
        if (recentError) throw recentError;
        return recentData as Article[];
      }
      
      return data as Article[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
        <div className="mb-4 border-b-2 border-primary pb-2">
          <h2 className="font-serif text-lg font-semibold text-foreground sm:text-xl">
            Most Read Today
          </h2>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-7 w-7 shrink-0" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/50 sm:p-5">
      <div className="mb-4 border-b-2 border-primary pb-2">
        <h2 className="font-serif text-lg font-semibold text-foreground sm:text-xl">
          Most Read Today
        </h2>
      </div>
      <ol className="space-y-4">
        {articles.map((article, index) => (
          <li key={article.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
            <span className="font-serif text-lg font-bold text-primary shrink-0 w-7 text-center leading-tight">
              {index + 1}
            </span>
            <Link
              to={`/${article.category_slug}/${article.article_slug}`}
              className="font-serif text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary hover:underline sm:text-base"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
