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
      const now = new Date();

      // Try last 24 hours first
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: day, error: e1 } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count")
        .eq("is_published", true)
        .gte("published_at", last24h)
        .order("view_count", { ascending: false })
        .limit(5);
      if (e1) throw e1;
      if (day && day.length >= 3 && day.some(a => (a.view_count || 0) > 0)) {
        return day as Article[];
      }

      // Fall back to last 72 hours
      const last72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
      const { data: week, error: e2 } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count")
        .eq("is_published", true)
        .gte("published_at", last72h)
        .order("view_count", { ascending: false })
        .limit(5);
      if (e2) throw e2;
      if (week && week.length >= 3 && week.some(a => (a.view_count || 0) > 0)) {
        return week as Article[];
      }

      // Final fallback: most recent articles
      const { data: recent, error: e3 } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(5);
      if (e3) throw e3;
      return (recent || []) as Article[];
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
