import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryLabel } from "@/lib/categories";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  view_count: number;
  published_at: string;
  hero_image?: string | null;
}

export function MostReadArticles() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["most-read-articles-spectator"],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { data: day } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at, hero_image")
        .eq("is_published", true)
        .gte("published_at", last24h)
        .order("view_count", { ascending: false })
        .limit(10);

      if (day && day.length >= 5 && day.some(a => (a.view_count || 0) > 0)) {
        return day as Article[];
      }

      const last72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
      const { data: week } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at, hero_image")
        .eq("is_published", true)
        .gte("published_at", last72h)
        .order("view_count", { ascending: false })
        .limit(10);
      if (week && week.length >= 5 && week.some(a => (a.view_count || 0) > 0)) {
        return week as Article[];
      }

      const { data: recent } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at, hero_image")
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
        <SpectatorHeader />
        <div className="grid grid-cols-1 gap-x-14 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-border py-5">
              <Skeleton className="h-8 w-6" />
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-16 w-16" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) return null;

  const list = articles.slice(0, 10);

  return (
    <section>
      <SpectatorHeader />
      <ol className="grid grid-cols-1 gap-x-14 md:grid-cols-2">
        {list.map((article, index) => (
          <li
            key={article.id}
            className="flex items-start gap-5 border-b border-border py-5"
          >
            <span className="most-read-number w-6 shrink-0 pt-1 text-left">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/${article.category_slug}/${article.article_slug}`}
                className="group block"
              >
                <div className="kicker-italic mb-1.5">
                  {getCategoryLabel(article.category_slug)}
                </div>
                <h3 className="story-title text-[18px] leading-[1.2] group-hover:text-primary">
                  {article.title}
                </h3>
              </Link>
            </div>
            {article.hero_image && (
              <Link
                to={`/${article.category_slug}/${article.article_slug}`}
                className="shrink-0"
                aria-hidden="true"
                tabIndex={-1}
              >
                <div className="h-16 w-20 overflow-hidden bg-muted sm:h-[72px] sm:w-[96px]">
                  <img
                    src={article.hero_image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SpectatorHeader() {
  return (
    <div className="mb-6 mt-2">
      <div className="hatched-rule" />
      <h2 className="section-title-serif mt-6 text-center">Most popular</h2>
    </div>
  );
}
