import Link from "next/link";
import { getRelativeTime } from "@/lib/time";
import { LiveDevelopingPill } from "@/components/LiveDevelopingPill";

interface TimelineArticle {
  id: string;
  title: string;
  article_slug: string;
  category_slug: string;
  published_at: string;
}

interface CaseTimelineProps {
  currentArticleId: string;
  articles: TimelineArticle[];
  thread: { thread_slug: string; is_live: boolean; live_ended_at: string | null } | null;
}

export function CaseTimeline({ currentArticleId, articles, thread }: CaseTimelineProps) {
  const isCurrentlyLive = !!thread?.is_live && !thread.live_ended_at;

  if (articles.length <= 1 && !isCurrentlyLive) return null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h3 className="mb-6 text-xl font-bold text-foreground">Case Timeline</h3>
      <ol className="space-y-4">
        {isCurrentlyLive && (
          <li>
            <Link
              href={`/live/${thread!.thread_slug}`}
              className="flex items-center gap-2 border-b border-border pb-4 hover:text-primary"
            >
              <LiveDevelopingPill />
              <span className="font-semibold">Live updates</span>
            </Link>
          </li>
        )}
        {articles.map((article) => (
          <li key={article.id} className={article.id === currentArticleId ? "font-bold text-foreground" : ""}>
            <Link
              href={`/${article.category_slug}/${article.article_slug}`}
              className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 hover:text-primary"
            >
              <span>{article.title}</span>
              <time className="shrink-0 text-xs text-muted-fg">{getRelativeTime(article.published_at)}</time>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
