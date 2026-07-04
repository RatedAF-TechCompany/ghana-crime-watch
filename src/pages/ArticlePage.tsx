import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime, getReadingTime } from "@/lib/time";
import { Volume2, Pause, Square } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentsSection } from "@/components/CommentsSection";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WhatsAppChannelCTA, useShouldShowWhatsAppCTA } from "@/components/WhatsAppChannelCTA";
import { AdBanner } from "@/components/AdBanner";
import DOMPurify from "dompurify";
import { useEffect, useRef, useMemo } from "react";

export default function ArticlePage() {
  const { categorySlug, articleSlug } = useParams<{
    categorySlug: string;
    articleSlug: string;
  }>();
  const { isPlaying, isPaused, isSupported, speak, stop, togglePlayPause } = useTextToSpeech();
  
  // Determine if WhatsApp CTA should be shown (25% probability, memoized per article)
  const showWhatsAppCTA = useMemo(() => useShouldShowWhatsAppCTA(), [articleSlug]);

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

  const handleListen = () => {
    if (isPlaying) {
      stop();
    } else {
      const textToRead = [
        article?.title,
        article?.subtitle,
        article?.body
      ].filter(Boolean).join('. ');
      speak(textToRead);
    }
  };

  // Track article view (only once per session per article)
  const viewTrackedRef = useRef<string | null>(null);
  
  useEffect(() => {
    const trackView = async () => {
      if (!article?.id || viewTrackedRef.current === article.id) return;
      
      viewTrackedRef.current = article.id;
      
      await supabase
        .from('articles')
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq('id', article.id);
    };
    
    trackView();
  }, [article?.id, article?.view_count]);

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
  const readingTime = getReadingTime(article.body);

  const processBodyText = (body: string) => {
    return body.replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g, '<mark>$1</mark>');
  };

  const sanitizedBody = DOMPurify.sanitize(processBodyText(article.body), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'mark'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <article className="mx-auto max-w-[760px]">
      <p className="author-italic-red mb-3 text-center">{categoryLabel}</p>
      <h1 className="mx-auto mb-5 max-w-[760px] text-center font-headline text-[34px] font-bold leading-[1.08] tracking-[-0.005em] text-foreground md:text-[52px] lg:text-[58px]">
        {article.title}
      </h1>

      {article.subtitle && (
        <p className="mx-auto mb-6 max-w-[720px] text-center font-body text-[19px] leading-[1.5] text-foreground/80 md:text-[21px]">
          {article.subtitle}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-border py-3 text-center">
        <p className="font-sans text-[12px] uppercase tracking-[0.14em] text-muted-fg">
          By <span className="not-italic text-foreground">{article.author_name || "GhanaCrimes Newsroom"}</span>
          <span className="mx-2">·</span>
          {relativeTime}
          <span className="mx-2">·</span>
          {readingTime}
        </p>
        <div className="flex items-center gap-1">
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
                  <><Volume2 className="h-4 w-4" /><span className="text-xs font-medium">Resume</span></>
                ) : (
                  <><Pause className="h-4 w-4" /><span className="text-xs font-medium">Pause</span></>
                )
              ) : (
                <><Volume2 className="h-4 w-4" /><span className="text-xs font-medium">Listen</span></>
              )}
            </Button>
          )}
          {isPlaying && (
            <Button variant="ghost" size="icon" onClick={stop} className="text-muted-foreground hover:text-primary" aria-label="Stop">
              <Square className="h-4 w-4" />
            </Button>
          )}
          <BookmarkButton articleId={article.id} />
        </div>
      </div>

      {article.hero_image && (
        <div className="mb-8 w-full overflow-hidden">
          <img
            src={article.hero_image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="my-6 border-y border-border py-3">
        <SocialShareButtons title={article.title} summary={article.summary} />
      </div>

      <div
        className="article-body max-w-none py-4"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />


      {/* Calabashe Ad - always shown if enabled */}
      <div className="my-8">
        <AdBanner slotId={3} probability={1} />
      </div>

      {/* WhatsApp CTA - shown based on probability */}
      {showWhatsAppCTA && (
        <div className="my-8 border-y border-border py-6">
          <WhatsAppChannelCTA variant="banner" />
        </div>
      )}

      <CommentsSection articleId={article.id} />

      {article.tags && article.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
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

      {relatedArticles && relatedArticles.length > 0 && (
        <section className="mt-10 border-t border-border pt-8">
          <h3 className="mb-6 text-xl font-bold text-foreground">
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
                  <h4 className="story-title text-base leading-snug group-hover:text-primary">
                    {related.title}
                  </h4>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {getRelativeTime(related.published_at!)}
                  </p>
                </div>
                <div className="h-16 w-24 flex-shrink-0 overflow-hidden">
                  {related.hero_image && (
                    <img
                      src={related.hero_image}
                      alt={related.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}