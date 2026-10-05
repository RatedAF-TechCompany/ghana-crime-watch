'use client';
import Link from "next/link";
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
import { LiveDevelopingPill } from "@/components/LiveDevelopingPill";
import { sanitizeArticleBody } from "@/lib/sanitize";
import { useEffect, useRef, type ReactNode } from "react";
import { getArticleImage } from "@/lib/article-image";
import { ArticleImageFallback } from "@/components/ArticleImage";
import { publishedUpdatedLabels } from "@/lib/article-meta";

type ThreadInfo = { thread_slug: string; is_live: boolean; live_ended_at: string | null } | null;

export default function ArticleView({ categorySlug, articleSlug, initialArticle, thread = null, children }: { categorySlug: string; articleSlug: string; initialArticle?: any; thread?: ThreadInfo; children?: ReactNode }) {
  const { isPlaying, isPaused, isSupported, speak, stop, togglePlayPause } = useTextToSpeech();

  // Determine if WhatsApp CTA should be shown (25% probability, memoized per article)
  const showWhatsAppCTA = useShouldShowWhatsAppCTA(articleSlug);

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
    initialData: initialArticle ?? undefined,
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

      await supabase.rpc('increment_view_count', { article_id: article.id });
    };

    trackView();
  }, [article?.id, article?.view_count]);


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
  const readingTime = getReadingTime(article.body);
  const modifiedIso = article.content_updated_at || article.published_at;
  const dateLabels = publishedUpdatedLabels(article.published_at!, modifiedIso);

  const processBodyText = (body: string) => {
    return body.replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g, '<mark>$1</mark>');
  };

  const sanitizedBody = sanitizeArticleBody(processBodyText(article.body));

  return (
    <article className="mx-auto max-w-[760px]">
      <p className="author-italic-red mb-3 text-center">{categoryLabel}</p>
      <h1 className="mx-auto mb-5 max-w-[760px] text-center font-headline text-[34px] font-bold leading-[1.08] tracking-[-0.005em] text-foreground md:text-[52px] lg:text-[58px]">
        {article.title}
      </h1>

      <p className="mb-5 text-center font-sans text-[13px] text-muted-foreground">
        <time dateTime={article.published_at}>{dateLabels.published}</time>
        {dateLabels.updated && (
          <> · <time dateTime={modifiedIso!}>{dateLabels.updated}</time></>
        )}
      </p>

      {article.subtitle && (
        <p className="mx-auto mb-6 max-w-[720px] text-center font-body text-[19px] leading-[1.5] text-foreground/80 md:text-[21px]">
          {article.subtitle}
        </p>
      )}

      {thread && (
        thread.is_live && !thread.live_ended_at ? (
          <a
            href={`/live/${thread.thread_slug}`}
            className="mb-6 flex items-center gap-2 rounded-md border-l-4 border-primary bg-muted px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/70"
          >
            <LiveDevelopingPill />
            <span>This is a developing story. Follow live updates</span>
          </a>
        ) : (
          <a href={`/live/${thread.thread_slug}`} className="mb-6 block rounded-md border-l-4 border-primary bg-muted px-4 py-3 text-sm text-foreground hover:bg-muted/70">
            This story has been updated. See the full timeline of updates.
          </a>
        )
      )}

      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-border py-3 text-center">
        <p className="font-sans text-[12px] uppercase tracking-[0.14em] text-muted-fg">
          Reported by <span className="not-italic text-foreground">{article.author_name || "GhanaCrimes Data Desk"}</span>
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

      {(() => { const img = getArticleImage(article); return (
        <div className="mb-8 aspect-[16/9] w-full overflow-hidden">
          {img ? (
          <img
            src={img}
            alt={article.title}
            className="h-full w-full object-cover"
          />
          ) : (
            <ArticleImageFallback categorySlug={article.category_slug} title={article.title} className="p-8" />
          )}
        </div>
      ); })()}

      <div className="my-6 border-y border-border py-3">
        <SocialShareButtons title={article.title} summary={article.summary} />
      </div>

      <div
        className="article-body max-w-none py-4"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />

      <div className="mt-2 space-y-2 border-t border-border pt-4 font-sans text-[13px] text-muted-fg">
        {(() => {
          const urls: string[] = Array.from(new Set([article.source_url, ...((article as any).source_urls || [])].filter(Boolean)));
          if (!urls.length) {
            return (
              <p><span className="font-semibold text-foreground">Source: </span>not recorded</p>
            );
          }
          return (
            <p>
              <span className="font-semibold text-foreground">Source: </span>
              {urls.map((u, i) => (
                <span key={u}>
                  {i > 0 && ", "}
                  <a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">
                    {(() => { try { return `Original report at ${new URL(u).hostname.replace(/^www\./, "")}`; } catch { return "Original report"; } })()}
                  </a>
                </span>
              ))}
            </p>
          );
        })()}
        <p>
          Spotted an error?{" "}
          <Link href={`/corrections?article=${encodeURIComponent(`/${article.category_slug}/${article.article_slug}`)}`} className="text-primary underline underline-offset-2">
            Request a correction
          </Link>
          {" "}· <Link href="/editorial-policy" className="underline underline-offset-2">Editorial policy</Link>
        </p>
      </div>


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

      {children}
    </article>
  );
}
