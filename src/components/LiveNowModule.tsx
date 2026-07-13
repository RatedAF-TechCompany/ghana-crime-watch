'use client';
import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LiveDevelopingPill } from "@/components/LiveDevelopingPill";
import { getRelativeTime } from "@/lib/time";

const LIVE_NOW_CAP = 3;

export function LiveNowModule() {
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["live-now-threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_threads")
        .select("id, thread_slug, title, summary")
        .eq("is_live", true)
        .is("live_ended_at", null)
        .order("live_started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const threadIds = useMemo(() => (threads ?? []).map((t) => t.id), [threads]);

  const { data: recentUpdates } = useQuery({
    queryKey: ["live-now-thread-freshness", threadIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thread_updates")
        .select("thread_id, published_at")
        .in("thread_id", threadIds)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: threadIds.length > 0,
  });

  const lastUpdatedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of recentUpdates ?? []) {
      if (!map.has(row.thread_id)) map.set(row.thread_id, row.published_at);
    }
    return map;
  }, [recentUpdates]);

  const rankedThreads = useMemo(() => {
    return (threads ?? [])
      .map((t) => ({ ...t, lastUpdatedAt: lastUpdatedMap.get(t.id) ?? null }))
      .filter((t): t is typeof t & { lastUpdatedAt: string } => !!t.lastUpdatedAt)
      .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
      .slice(0, LIVE_NOW_CAP);
  }, [threads, lastUpdatedMap]);

  if (threadsLoading) return null;
  if (rankedThreads.length === 0) return null;

  return (
    <section aria-label="Live coverage">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="section-heading">Live Now</h3>
      </div>
      <div className="space-y-3">
        {rankedThreads.map((t) => (
          <Link
            key={t.id}
            href={`/live/${t.thread_slug}`}
            className="flex flex-col gap-1.5 rounded-md border-l-4 border-primary bg-muted px-4 py-3 hover:bg-muted/70"
          >
            <div className="flex items-center gap-2">
              <LiveDevelopingPill />
              <span className="story-title text-[16px] font-bold leading-[1.2] text-foreground">
                {t.title}
              </span>
            </div>
            {t.summary && (
              <p className="line-clamp-1 text-sm text-foreground/80">{t.summary}</p>
            )}
            <p className="text-xs uppercase tracking-[0.1em] text-muted-fg">
              Last updated: {getRelativeTime(t.lastUpdatedAt)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
