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
      <div className="border-y border-border py-6 my-8">
        <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-muted-foreground">
          Most Read Today
        </h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0" />
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
    <div className="border-y border-border py-6 my-8">
      <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-muted-foreground">
        Most Read Today
      </h2>
      <ol className="space-y-3">
        {articles.map((article, index) => (
          <li key={article.id} className="flex items-start gap-3">
            <span className="text-2xl font-bold text-primary shrink-0 w-8 text-center leading-tight">
              {index + 1}
            </span>
            <Link
              to={`/${article.category_slug}/${article.article_slug}`}
              className="text-foreground hover:text-primary transition-colors font-medium leading-snug line-clamp-2"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
