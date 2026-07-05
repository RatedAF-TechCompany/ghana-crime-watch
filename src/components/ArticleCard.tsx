import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getArticleImage } from "@/lib/article-image";

type Variant = "grid" | "lead" | "secondary" | "compact" | "stacked" | "list-item";

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
  showImage?: boolean;
  className?: string;
}

export function ArticleCard({ article, variant, showImage, className }: ArticleCardProps) {
  const categoryLabel = getCategoryLabel(article.category_slug);
  const relativeTime = getRelativeTime(article.published_at);
  const v: Variant = variant ?? (showImage ? "grid" : "compact");
  const href = `/${article.category_slug}/${article.article_slug}`;
  const imageUrl = getArticleImage(article);


  // Bylines: italic red kicker (category label acting as author byline)
  const kicker = <p className="author-italic-red mb-1.5">{categoryLabel}</p>;

  if (v === "compact" || v === "list-item") {
    return (
      <article className={cn("group border-b border-border py-4", className)}>
        <Link to={href} className="block">
          {kicker}
          <h3 className="story-title text-[18px] leading-[1.2] group-hover:text-primary">
            {article.title}
          </h3>
          <div className="mt-1.5 meta-text">
            <span>{relativeTime}</span>
          </div>
        </Link>
      </article>
    );
  }

  if (v === "stacked" || v === "secondary") {
    return (
      <article className={cn("group border-b border-border pb-5 last:border-b-0", className)}>
        <Link to={href} className="block">
          {kicker}
          <h3 className="story-title text-[19px] leading-[1.18] group-hover:text-primary sm:text-[21px]">
            {article.title}
          </h3>
          {imageUrl && (
            <div className="mt-3 aspect-[4/3] w-full overflow-hidden">
              <img
                src={imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </Link>
      </article>
    );
  }

  // grid / lead
  const titleSize =
    v === "lead" ? "text-[26px] sm:text-[30px]" : "text-[19px] sm:text-[21px]";

  return (
    <article className={cn("group flex flex-col", className)}>
      <Link to={href} className="flex flex-col">
        {imageUrl && (
          <div className="aspect-[4/3] w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="pt-3 pb-4">
          {kicker}
          <h3 className={cn("story-title group-hover:text-primary", titleSize)}>
            {article.title}
          </h3>
          <div className="mt-2 meta-text">
            <span>{relativeTime}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
