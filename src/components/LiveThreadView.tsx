'use client';
import { useEffect, useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { getAbsoluteTime, getRelativeTime, isRecent } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveDevelopingPill } from "@/components/LiveDevelopingPill";
import { useThreadUpdatesRealtime, type ThreadUpdateRow } from "@/hooks/use-thread-updates-realtime";

const UPDATES_PER_PAGE = 20;

const sanitizeBody = (body: string) =>
  DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

export default function LiveThreadView({ threadSlug }: { threadSlug: string }) {
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["live-thread", threadSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_threads")
        .select("id, thread_slug, title, summary, is_live, live_started_at, live_ended_at")
        .eq("thread_slug", threadSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!threadSlug,
  });

  const [page, setPage] = useState(0);
  const [loadedUpdates, setLoadedUpdates] = useState<ThreadUpdateRow[]>([]);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  useEffect(() => {
    setLoadedUpdates([]);
    setPage(0);
  }, [thread?.id]);

  const { data: updatesPage, isLoading: updatesLoading } = useQuery({
    queryKey: ["thread-updates", thread?.id, page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thread_updates")
        .select("id, thread_id, title, body, is_key_point, key_point_label, source_article_id, published_at")
        .eq("thread_id", thread!.id)
        .order("published_at", { ascending: false })
        .range(page * UPDATES_PER_PAGE, (page + 1) * UPDATES_PER_PAGE - 1);
      if (error) throw error;
      return data;
    },
    enabled: !!thread?.id,
  });

  useEffect(() => {
    if (!updatesPage) return;
    setLoadedUpdates((prev) => {
      const existingIds = new Set(prev.map((u) => u.id));
      const fresh = updatesPage.filter((u) => !existingIds.has(u.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, [updatesPage]);

  const hasMore = (updatesPage?.length ?? 0) === UPDATES_PER_PAGE;

  const sourceArticleIds = useMemo(
    () => Array.from(new Set(loadedUpdates.map((u) => u.source_article_id).filter((id): id is string => !!id))),
    [loadedUpdates]
  );

  const { data: sourceArticles } = useQuery({
    queryKey: ["thread-source-articles", sourceArticleIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, category_slug, article_slug")
        .in("id", sourceArticleIds);
      if (error) throw error;
      return data;
    },
    enabled: sourceArticleIds.length > 0,
  });

  const sourceArticleMap = useMemo(() => {
    const map = new Map<string, { category_slug: string; article_slug: string }>();
    (sourceArticles ?? []).forEach((a) => map.set(a.id, a));
    return map;
  }, [sourceArticles]);

  const { pendingUpdates, clearPending } = useThreadUpdatesRealtime(thread?.id);

  const showPendingUpdates = () => {
    setLoadedUpdates((prev) => {
      const existingIds = new Set(prev.map((u) => u.id));
      const fresh = pendingUpdates.filter((u) => !existingIds.has(u.id));
      return [...fresh, ...prev];
    });
    clearPending();
  };

  // Force a re-render every minute so the "NEW" label expires on schedule
  // while a reader is actively watching the feed.
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const interval = setInterval(() => forceTick(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const keyPoints = useMemo(
    () =>
      loadedUpdates
        .filter((u) => u.is_key_point)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()),
    [loadedUpdates]
  );

  const displayedUpdates = useMemo(
    () => (sortOrder === "oldest" ? [...loadedUpdates].reverse() : loadedUpdates),
    [loadedUpdates, sortOrder]
  );

  const newestPublishedAt = loadedUpdates[0]?.published_at ?? null;

  if (threadLoading) {
    return (
      <div className="mx-auto max-w-[760px] space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold">Live Updates Not Found</h2>
        <p className="text-muted-foreground">This live thread doesn't exist or may have been removed.</p>
      </div>
    );
  }

  const isCurrentlyLive = thread.is_live && !thread.live_ended_at;

  return (
    <div className="mx-auto max-w-[760px]">
      {thread.live_ended_at && (
        <div className="mb-4 rounded-md bg-muted px-4 py-2 text-sm text-muted-fg">
          Live coverage of this story has ended.
        </div>
      )}

      {isCurrentlyLive && (
        <div className="mb-2">
          <LiveDevelopingPill />
        </div>
      )}

      <h1 className="font-headline text-[34px] font-bold leading-[1.08] tracking-[-0.005em] text-foreground md:text-[52px]">
        {thread.title}
      </h1>

      {thread.summary && <p className="mt-3 text-lg text-foreground/80">{thread.summary}</p>}

      {newestPublishedAt && (
        <p className="mt-2 text-xs uppercase tracking-[0.1em] text-muted-fg">
          Last updated: {getRelativeTime(newestPublishedAt)}
        </p>
      )}

      {keyPoints.length > 0 && (
        <div className="my-6 rounded-md border-l-4 border-primary bg-muted p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">{thread.title}</h2>
          <ul className="space-y-2">
            {keyPoints.map((kp) => (
              <li key={kp.id} className="flex items-start justify-between gap-3 text-sm">
                <span>{kp.key_point_label}</span>
                <a
                  href={`#update-${kp.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`update-${kp.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary hover:underline"
                >
                  View post
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-fg">Sort by:</span>
          <button
            onClick={() => setSortOrder("latest")}
            className={sortOrder === "latest" ? "font-bold text-primary" : "text-muted-fg"}
          >
            Latest
          </button>
          <span className="text-muted-fg">|</span>
          <button
            onClick={() => setSortOrder("oldest")}
            className={sortOrder === "oldest" ? "font-bold text-primary" : "text-muted-fg"}
          >
            Oldest
          </button>
        </div>
      </div>

      {pendingUpdates.length > 0 && (
        <div className="sticky top-4 z-10 mb-4 flex justify-center">
          <button
            onClick={showPendingUpdates}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
          >
            {pendingUpdates.length} new update{pendingUpdates.length > 1 ? "s" : ""} · tap to show
          </button>
        </div>
      )}

      {displayedUpdates.length === 0 && !updatesLoading ? (
        <p className="py-8 text-center text-muted-foreground">No updates yet.</p>
      ) : (
        <div>
          {displayedUpdates.map((update) => (
            <div key={update.id} id={`update-${update.id}`} className="border-b border-border py-5">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-fg">
                <time dateTime={update.published_at}>{getRelativeTime(update.published_at)}</time>
                <span>·</span>
                <time dateTime={update.published_at}>{getAbsoluteTime(update.published_at)}</time>
                {isRecent(update.published_at, 60) && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    New
                  </span>
                )}
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{update.title}</h3>
              <div
                className="space-y-2 text-sm text-foreground/90"
                dangerouslySetInnerHTML={{ __html: sanitizeBody(update.body) }}
              />
              {update.source_article_id && sourceArticleMap.has(update.source_article_id) && (
                <Link
                  href={`/${sourceArticleMap.get(update.source_article_id)!.category_slug}/${sourceArticleMap.get(update.source_article_id)!.article_slug}`}
                  className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Read the full story →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={updatesLoading}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
