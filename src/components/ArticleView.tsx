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
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { FollowGhanaCrimes } from "@/components/FollowGhanaCrimes";
import { formatArticleBody } from "@/lib/paragraphs";
import { caseStatusText, offenceInfo, regionInfo } from "@/lib/crime-labels";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WhatsAppChannelCTA, useShouldShowWhatsAppCTA } from "@/components/WhatsAppChannelCTA";
import { AdBanner } from "@/components/AdBanner";
import { LiveDevelopingPill } from "@/components/LiveDevelopingPill";
import { sanitizeArticleBody } from "@/lib/sanitize";
import { useEffect, useRef, type ReactNode } from "react";
import { getArticleImage } from "@/lib/article-image";
import { independentOutlets, publishedUpdatedLabels } from "@/lib/article-meta";
import { CaseStatusBadge } from "@/components/CaseStatusBadge";
import { displayByline } from "@/lib/authors";
import { StoryUpdates, type StoryUpdate } from "@/components/StoryUpdates";

type ThreadInfo = { thread_slug: string; is_live: boolean; live_ended_at: string | null } | null;

export default function ArticleView({ categorySlug, articleSlug, initialArticle, thread = null, authorHref, children, updates: storyUpdates = [] }: { categorySlug: string; articleSlug: string; initialArticle?: any; thread?: ThreadInfo; authorHref?: string; children?: ReactNode; updates?: StoryUpdate[] }) {
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
    // Highlight figures in text only: never inside tags (href/src attributes) or link text.
    let inLink = 0;
    return body.split(/(<[^>]+>)/g).map((part) => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) inLink++;
        else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1);
        return part;
      }
      return inLink ? part : part.replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g, '<mark>$1</mark>');
    }).join('');
  };

  const formattedBody = formatArticleBody(article.body);
  // Updates timeline: dated "Update (...)" paragraphs added when another outlet reports the same story.
  const updates: { when: string; html: string }[] = [];
  const mainBody = formattedBody.replace(/<p>\s*<strong>Update \(([^)]*)\):<\/strong>([\s\S]*?)<\/p>\s*/g, (_m: string, when: string, rest: string) => { updates.push({ when, html: rest.trim() }); return ''; });
  const sanitizedBody = sanitizeArticleBody(processBodyText(mainBody));
  const sanitizedUpdates = updates.map((u) => ({ when: u.when, html: sanitizeArticleBody(u.html) }));
  const a2: any = article;
  const reg = regionInfo(a2.region);
  const off = offenceInfo(a2.offence_type);
  const status = caseStatusText(a2.case_status);
  const srcUrls: string[] = Array.from(new Set([a2.source_url, ...(a2.source_urls || [])].filter(Boolean)));
  // "Verified" only when the pipeline matched the same story at another independent outlet (gate_report.corroborating_sources)
  // AND at least two distinct outlets are linked. Related-but-different stories in source_urls do not count on their own.
  const allOutlets = independentOutlets(srcUrls);
  const corroborating = Number(a2.gate_report?.corroborating_sources || 0);
  const outlets = corroborating >= 1 && allOutlets.length >= 2 ? allOutlets.slice(0, Math.min(allOutlets.length, corroborating + 1)) : [];
  const srcHosts = srcUrls.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }).filter(Boolean);
  const unresolved = a2.case_status === 'convicted' || a2.case_status === 'acquitted' ? [] : [
    "Whether anyone will be found guilty: no court has ruled on guilt, so everyone named is presumed innocent.",
    ...(['reported', 'unknown', null, undefined].includes(a2.case_status) ? ["Whether any arrest has been made, as none was reported in the source."] : []),
    ...(a2.case_status === 'arrested' ? ["Whether charges will be filed in court."] : []),
    "Any details not stated by the sources below. GhanaCrimes has not added facts the sources did not report.",
  ];

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
      {(a2.case_status || outlets.length >= 2) && (
        <p className="mb-5 flex flex-wrap items-center justify-center gap-2">
          <CaseStatusBadge status={a2.case_status} />
          {outlets.length >= 2 && (
            <span title={`The same story was reported independently by ${outlets.length} outlets. All sources are listed below.`} className="inline-block rounded-sm border border-emerald-700/40 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Verified by {outlets.length} sources
            </span>
          )}
        </p>
      )}

      {article.subtitle && (
        <p className="mx-auto mb-6 max-w-[720px] text-center font-body text-[19px] leading-[1.5] text-foreground/80 md:text-[21px]">
          {article.subtitle}
        </p>
      )}

      <StoryUpdates updates={storyUpdates} />

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
          Reported by {authorHref ? <Link href={authorHref} className="not-italic text-foreground hover:text-primary">{displayByline(article.author_name)}</Link> : <span className="not-italic text-foreground">{displayByline(article.author_name)}</span>}
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

      {(() => { const img = getArticleImage(article); return img ? (
        <div className="mb-8 aspect-[16/9] w-full overflow-hidden">
          <img
            src={img}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null; })()}

      <div className="my-6 border-y border-border py-3">
        <SocialShareButtons title={article.title} summary={article.summary} />
      </div>

      {(reg || off || status || srcHosts.length > 0) && (
        <aside aria-label="Key facts" className="my-6 rounded-md border-l-4 border-primary bg-muted/60 px-5 py-4 font-sans text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Key facts</h2>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
            {off && (<><dt className="font-semibold">Crime type</dt><dd><Link href={off.href} className="underline underline-offset-2">{off.label}</Link></dd></>)}
            {reg && (<><dt className="font-semibold">Region</dt><dd><Link href={`/regions/${reg.slug}`} className="underline underline-offset-2">{reg.name}</Link></dd></>)}
            {status && (<><dt className="font-semibold">Case status</dt><dd>{status}</dd></>)}
            {srcHosts.length > 0 && (<><dt className="font-semibold">Sources</dt><dd>{Array.from(new Set(srcHosts)).join(", ")}</dd></>)}
            {sanitizedUpdates.length > 0 && (<><dt className="font-semibold">Updates</dt><dd>{sanitizedUpdates.length}</dd></>)}
          </dl>
        </aside>
      )}

      <div
        className="article-body max-w-none py-4"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />

      <section aria-label="What we know and what we don't" className="my-6 grid gap-4 font-sans text-sm md:grid-cols-2">
        <div className="rounded-md border border-border p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em]">What we know</h2>
          <ul className="list-disc space-y-1 pl-4">
            {article.summary && <li>{article.summary}</li>}
            {status && <li>Case status: {status}.</li>}
            {srcHosts.length > 0 && <li>Reported by {Array.from(new Set(srcHosts)).join(", ")}.</li>}
          </ul>
        </div>
        {unresolved.length > 0 && (
          <div className="rounded-md border border-border p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em]">What we don&apos;t know yet</h2>
            <ul className="list-disc space-y-1 pl-4">{unresolved.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
      </section>

      {sanitizedUpdates.length > 0 && (
        <section aria-label="Updates timeline" className="my-6">
          <h2 className="mb-3 font-sans text-xs font-bold uppercase tracking-[0.16em] text-primary">Updates timeline</h2>
          <ol className="relative space-y-4 border-l-2 border-primary pl-5">
            {sanitizedUpdates.map((u, i) => (
              <li key={i} className="font-sans text-sm">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{u.when}</p>
                <div className="article-body" dangerouslySetInnerHTML={{ __html: u.html }} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="my-6 border-y border-border py-3">
        <SocialShareButtons title={article.title} summary={article.summary} />
      </div>

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
          <Link rel="nofollow" href={`/corrections?article=${encodeURIComponent(`/${article.category_slug}/${article.article_slug}`)}`} className="text-primary underline underline-offset-2">
            Request a correction
          </Link>
          {" "}· <Link rel="nofollow" href={`/corrections?type=takedown&article=${encodeURIComponent(`/${article.category_slug}/${article.article_slug}`)}`} className="text-primary underline underline-offset-2">Request a takedown or privacy review</Link>
          {" "}· <Link href="/tips" className="underline underline-offset-2">Send us a tip</Link>
          {" "}· <Link href="/editorial-policy" className="underline underline-offset-2">Editorial policy</Link>
        </p>
      </div>


      <div className="my-8"><NewsletterSignup /></div>

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

      <div className="my-8"><FollowGhanaCrimes /></div>

      {(reg || off || (article.tags && article.tags.length > 0)) && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
          {off && <Link href={off.href} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{off.label}</Link>}
          {reg && <Link href={`/regions/${reg.slug}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{reg.name}</Link>}
          {(article.tags || []).map((tag) => (
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
