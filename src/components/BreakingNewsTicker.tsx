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
      // Get articles from the last 24 hours marked as top-stories
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
    refetchInterval: 60000, // Refetch every minute
  });

  // Auto-rotate through breaking news
  useEffect(() => {
    if (!breakingNews || breakingNews.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % breakingNews.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [breakingNews]);

  if (!breakingNews || breakingNews.length === 0) {
    return null;
  }

  const currentArticle = breakingNews[currentIndex];

  return (
    <div className="relative overflow-hidden bg-destructive text-destructive-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 py-2">
          {/* Breaking Badge */}
          <div className="flex shrink-0 items-center gap-1.5 rounded bg-background/20 px-2 py-0.5">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Breaking
            </span>
          </div>

          {/* News Ticker */}
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateY(0)`,
              }}
            >
              <Link
                to={`/${currentArticle.category_slug}/${currentArticle.article_slug}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {currentArticle.title}
              </Link>
            </div>
          </div>

          {/* Dots indicator */}
          {breakingNews.length > 1 && (
            <div className="flex shrink-0 gap-1">
              {breakingNews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-destructive-foreground"
                      : "bg-destructive-foreground/40"
                  }`}
                  aria-label={`Go to news ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Animated line at bottom */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden bg-destructive-foreground/20">
        <div
          className="h-full bg-destructive-foreground/60 transition-all duration-[5000ms] ease-linear"
          style={{
            width: "100%",
            transform: `translateX(-${100 - ((currentIndex + 1) / breakingNews.length) * 100}%)`,
          }}
        />
      </div>
    </div>
  );
}
