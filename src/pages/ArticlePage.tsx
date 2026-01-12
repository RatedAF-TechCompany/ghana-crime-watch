import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";
import { Bookmark, Share2, Volume2, Pause, Square } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentsSection } from "@/components/CommentsSection";
import DOMPurify from "dompurify";
import { useState } from "react";
import { toast } from "sonner";

export default function ArticlePage() {
  const { categorySlug, articleSlug } = useParams<{
    categorySlug: string;
    articleSlug: string;
  }>();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { isPlaying, isPaused, isSupported, speak, stop, togglePlayPause } = useTextToSpeech();

  const handleListen = () => {
    if (isPlaying) {
      stop();
    } else {
      // Combine title, subtitle, and body for reading
      const textToRead = [
        article?.title,
        article?.subtitle,
        article?.body
      ].filter(Boolean).join('. ');
      speak(textToRead);
    }
  };

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", categorySlug, articleSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category_slug", categorySlug!)
        .eq("article_slug", articleSlug!)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug && !!articleSlug,
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ["related-articles", categorySlug, article?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, article_slug, category_slug, published_at, hero_image")
        .eq("category_slug", categorySlug!)
        .eq("is_published", true)
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug && !!article?.id,
  });

  const handleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please log in to bookmark articles");
      return;
    }

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("article_id", article!.id);
      setIsBookmarked(false);
      toast.success("Bookmark removed");
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, article_id: article!.id });
      setIsBookmarked(true);
      toast.success("Article bookmarked");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article!.title,
        text: article!.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold">Article Not Found</h2>
        <p className="text-muted-foreground">The article you're looking for doesn't exist.</p>
      </div>
    );
  }

  const categoryLabel = getCategoryLabel(article.category_slug);
  const relativeTime = getRelativeTime(article.published_at!);

  // Add mark tags to numbers for highlight effect
  const processBodyText = (body: string) => {
    return body.replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g, '<mark>$1</mark>');
  };

  const sanitizedBody = DOMPurify.sanitize(processBodyText(article.body), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'mark'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <article>
      {article.hero_image && (
        <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded">
          <img
            src={article.hero_image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-primary">
          {categoryLabel} • {relativeTime}
        </p>
        <div className="flex gap-2">
          {isSupported && (
            <Button
              variant="ghost"
              size="sm"
              onClick={isPlaying ? togglePlayPause : handleListen}
              className="gap-2 text-muted-foreground hover:text-primary"
              aria-label={isPlaying ? (isPaused ? "Resume" : "Pause") : "Listen to article"}
            >
              {isPlaying ? (
                isPaused ? (
                  <>
                    <Volume2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    <span className="text-xs font-medium">Pause</span>
                  </>
                )
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Listen</span>
                </>
              )}
            </Button>
          )}
          {isPlaying && (
            <Button
              variant="ghost"
              size="icon"
              onClick={stop}
              className="text-muted-foreground hover:text-primary"
              aria-label="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBookmark}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">
        {article.title}
      </h1>

      {article.subtitle && (
        <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
          {article.subtitle}
        </h2>
      )}

      <p className="mb-2 text-sm text-muted-foreground">
        By {article.author_name || "GhanaCrimes Staff"}
      </p>

      <div
        className="article-body prose prose-lg max-w-none py-6"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />

      {article.tags && article.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Read More Section */}
      {relatedArticles && relatedArticles.length > 0 && (
        <section className="mt-10 border-t border-border pt-8">
          <h3 className="mb-6 font-serif text-xl font-bold text-foreground">
            Read More in {categoryLabel}
          </h3>
          <div className="space-y-4">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                to={`/${related.category_slug}/${related.article_slug}`}
                className="group flex items-start gap-4 border-b border-border py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {related.title}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getRelativeTime(related.published_at!)}
                  </p>
                </div>
                {related.hero_image && (
                  <div className="h-16 w-24 flex-shrink-0 overflow-hidden">
                    <img
                      src={related.hero_image}
                      alt={related.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comments Section */}
      <CommentsSection articleId={article.id} />
    </article>
  );
}
