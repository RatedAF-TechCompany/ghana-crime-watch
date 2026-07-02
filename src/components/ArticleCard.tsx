import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Variant = "grid" | "lead" | "secondary" | "compact";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary?: string;
    body?: string;
    category_slug: string;
    article_slug: string;
    published_at: string;
    hero_image?: string | null;
  };
  variant?: Variant;
  showImage?: boolean; // legacy prop for backward compat
  className?: string;
}

export function ArticleCard({ article, variant, showImage, className }: ArticleCardProps) {
  const categoryLabel = getCategoryLabel(article.category_slug);
  const relativeTime = getRelativeTime(article.published_at);

  // Backward-compat: legacy usage without variant
  const v: Variant = variant ?? (showImage ? "grid" : "compact");

  const href = `/${article.category_slug}/${article.article_slug}`;

  if (v === "compact") {
    return (
      <article className={cn("group border-b border-border py-4", className)}>
        <Link to={href} className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="story-title text-base sm:text-lg group-hover:text-primary group-hover:underline">
              {article.title}
            </h3>
            <div className="mt-1.5 meta-text">
              <span className="uppercase tracking-wide text-primary font-semibold">{categoryLabel}</span>
              <span className="mx-1.5">|</span>
              <span>{relativeTime}</span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  const titleSize =
    v === "lead"
      ? "text-2xl sm:text-3xl"
      : v === "secondary"
        ? "text-xl"
        : "text-lg sm:text-[21px]";

  return (
    <article className={cn("group flex flex-col", className)}>
      <Link to={href} className="flex flex-col">
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          {article.hero_image ? (
            <img
              src={article.hero_image}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-white">
              <span className="font-display text-3xl tracking-wider">GHANACRIMES</span>
            </div>
          )}
        </div>
        <div className="pt-3 pb-4 border-b border-border">
          <h3 className={cn("story-title group-hover:text-primary", titleSize)}>
            {article.title}
          </h3>
          <div className="mt-2 meta-text">
            <span>{relativeTime}</span>
            <span className="mx-1.5">|</span>
            <span className="uppercase tracking-wide font-semibold text-primary">{categoryLabel}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
