'use client';

import { useId, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";

type RailArticle = {
  id: string;
  title: string;
  summary?: string | null;
  body?: string;
  category_slug: string;
  article_slug: string;
  published_at: string;
  hero_image?: string | null;
};

export function ArticleCardRail({
  title,
  articles,
  moreHref,
}: {
  title: string;
  articles: RailArticle[];
  moreHref?: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const headingId = useId();

  if (!articles?.length) return null;

  const scrollByDir = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    const amount = (card?.getBoundingClientRect().width ?? 260) + 20;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * amount, behavior: reduce ? "auto" : "smooth" });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByDir(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByDir(-1);
    }
  };

  return (
    <section aria-labelledby={headingId} className="min-w-0 max-w-full">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h2 id={headingId} className="ox-section-title">{title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {moreHref && (
            <Link href={moreHref} className="font-sans text-sm text-foreground underline-offset-2 hover:underline">
              See all
            </Link>
          )}
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            aria-label={`Previous ${title}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffef00]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            aria-label={`Next ${title}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffef00]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      <ul
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={`${title}. Scroll sideways, or use the arrow keys when this list is focused.`}
        className="ox-rail flex list-none gap-5 overflow-x-auto overscroll-x-contain pb-2"
      >
        {articles.map((article) => (
          <li key={article.id} className="w-[78vw] shrink-0 snap-start sm:w-[280px] lg:w-[240px]">
            <ArticleCard article={article} variant="grid" />
          </li>
        ))}
      </ul>
    </section>
  );
}
