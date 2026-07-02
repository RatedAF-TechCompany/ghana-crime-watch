import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/broadcast/SectionHeading";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  view_count: number;
  published_at: string;
}

export function MostReadArticles() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["most-read-articles-10"],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { data: day } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at")
        .eq("is_published", true)
        .gte("published_at", last24h)
        .order("view_count", { ascending: false })
        .limit(10);

      if (day && day.length >= 6 && day.some(a => (a.view_count || 0) > 0)) {
        return day as Article[];
      }

      const last72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
      const { data: week } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at")
        .eq("is_published", true)
        .gte("published_at", last72h)
        .order("view_count", { ascending: false })
        .limit(10);
      if (week && week.length >= 6 && week.some(a => (a.view_count || 0) > 0)) {
        return week as Article[];
      }

      const { data: recent } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(10);
      return (recent || []) as Article[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section>
        <SectionHeading title="Most Read" />
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-border py-6">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) return null;

  return (
    <section>
      <SectionHeading title="Most popular" />
      <ol className="grid grid-cols-1 gap-x-10 md:grid-cols-3">
        {articles.slice(0, 9).map((article, index) => (
          <li
            key={article.id}
            className="flex items-start gap-4 border-b border-border py-5"
          >
            <span className="most-read-number shrink-0 w-8 text-left">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/${article.category_slug}/${article.article_slug}`}
                className="story-title block text-[17px] leading-[1.2] hover:text-primary"
              >
                {article.title}
              </Link>
              <div className="mt-1.5 meta-text">
                <span className="cat">{getCategoryLabel(article.category_slug)}</span>
                <span className="mx-1.5">|</span>
                <span>{getRelativeTime(article.published_at)}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
