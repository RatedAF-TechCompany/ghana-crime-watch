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

function initialsFor(slug: string) {
  const parts = slug.replace(/-/g, " ").split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "G").toUpperCase() + (parts[1]?.[0] ?? "C").toUpperCase();
}

export function MostReadArticles() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["most-popular-writers"],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: day } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at, hero_image")
        .eq("is_published", true)
        .gte("published_at", last24h)
        .order("view_count", { ascending: false })
        .limit(12);
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
        .limit(12);
      if (week && week.length >= 5) return week as Article[];
      const { data: recent } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, view_count, published_at, hero_image")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(12);
      return (recent || []) as Article[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section>
        <Header />
        <div className="grid grid-cols-1 gap-x-14 md:grid-cols-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-border py-5">
              <Skeleton className="h-8 w-6" />
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-16 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) return null;

  const popular = articles.slice(0, 5);
  const writers = articles.slice(5, 10);

  return (
    <section>
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Most popular */}
        <div className="md:pr-10">
          <h3 className="section-title-serif mb-4 text-center">Most popular</h3>
          <ol>
            {popular.map((a, i) => (
              <li key={a.id} className="flex items-start gap-5 border-b border-border py-5">
                <span className="pale-rank-number w-8 shrink-0 pt-1">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/${a.category_slug}/${a.article_slug}`} className="group block">
                    <p className="author-italic-red mb-1">{getCategoryLabel(a.category_slug)}</p>
                    <h4 className="story-title text-[19px] leading-[1.15] group-hover:text-primary sm:text-[22px]">
                      {a.title}
                    </h4>
                  </Link>
                </div>
                <Link
                  to={`/${a.category_slug}/${a.article_slug}`}
                  className="shrink-0"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <div className="h-[74px] w-[120px] overflow-hidden bg-muted">
                    {a.hero_image && (
                      <img
                        src={a.hero_image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        {/* Writers */}
        <div className="border-t border-border md:border-l md:border-t-0 md:pl-10">
          <h3 className="section-title-serif mb-4 mt-5 text-center md:mt-0">Writers</h3>
          <ol>
            {writers.map((a) => {
              const cat = getCategoryLabel(a.category_slug);
              return (
                <li key={a.id} className="flex items-start gap-5 border-b border-border py-5">
                  <div className="min-w-0 flex-1">
                    <Link to={`/${a.category_slug}/${a.article_slug}`} className="group block">
                      <p className="author-italic-red mb-1">{cat}</p>
                      <h4 className="story-title text-[19px] leading-[1.15] group-hover:text-primary sm:text-[22px]">
                        {a.title}
                      </h4>
                    </Link>
                  </div>
                  <div
                    aria-hidden="true"
                    className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full border border-border bg-muted font-headline text-[20px] italic text-primary"
                  >
                    {initialsFor(a.category_slug)}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <div className="mb-2 mt-2">
      <div className="hatched-rule" />
    </div>
  );
}
