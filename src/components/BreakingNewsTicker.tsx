import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface BreakingArticle {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  published_at: string;
}

export function BreakingNewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: breakingNews } = useQuery({
    queryKey: ["breaking-news"],
    queryFn: async () => {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data, error } = await supabase
        .from("articles")
        .select("id, title, category_slug, article_slug, published_at")
        .eq("is_published", true)
        .eq("category_slug", "top-stories")
        .gte("published_at", oneDayAgo.toISOString())
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as BreakingArticle[];
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!breakingNews || breakingNews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % breakingNews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [breakingNews]);

  if (!breakingNews || breakingNews.length === 0) return null;

  const currentArticle = breakingNews[currentIndex];

  return (
    <div className="w-full bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-3 py-2">
          <div className="flex shrink-0 items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest">
              Breaking
            </span>
          </div>
          <div className="h-4 w-px bg-primary-foreground/40" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <Link
              to={`/${currentArticle.category_slug}/${currentArticle.article_slug}`}
              className="block truncate text-sm font-semibold hover:underline"
            >
              {currentArticle.title}
            </Link>
          </div>
          {breakingNews.length > 1 && (
            <div className="hidden shrink-0 gap-1 sm:flex">
              {breakingNews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-primary-foreground"
                      : "bg-primary-foreground/40"
                  }`}
                  aria-label={`Go to news ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
