import Link from "next/link";
import { getCategoryLabel } from "@/lib/categories";
import { getPublishedTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getArticleImage } from "@/lib/article-image";
import { ArticleImageFallback } from "@/components/ArticleImage";

type Variant = "grid" | "lead" | "secondary" | "compact" | "stacked" | "list-item";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary?: string | null;
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
  const publishedTime = getPublishedTime(article.published_at);
  const v: Variant = variant ?? (showImage ? "grid" : "compact");
  const href = `/${article.category_slug}/${article.article_slug}`;
  const imageUrl = getArticleImage(article);
  const summary = (article.summary || "").trim();
  const titleSize = v === "lead" ? "text-[26px] leading-[1.1] sm:text-[30px]" : "text-[18px] leading-[1.15] sm:text-[20px]";

  const media = (
    <div className={cn("relative overflow-hidden bg-[#141414]", v === "compact" || v === "list-item" ? "aspect-video w-full" : "aspect-video w-full")}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <ArticleImageFallback categorySlug={article.category_slug} title={article.title} />
      )}
    </div>
  );

  const copy = (
    <div className="flex min-w-0 flex-1 flex-col pt-3 transition-opacity duration-200 group-hover:opacity-80">
      <p className="card-kicker">{categoryLabel}</p>
      <h3 className={cn("story-title", titleSize)}>{article.title}</h3>
      {summary && (
        <p className="mt-2 line-clamp-3 font-sans text-[15px] font-light leading-[1.35] text-muted-foreground">
          {summary}
        </p>
      )}
      {publishedTime && (
        <time dateTime={article.published_at} className="mt-2 font-sans text-xs font-normal text-[#9b9b9b]">
          {publishedTime}
        </time>
      )}
    </div>
  );

  const linkClass = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffef00]";

  if (v === "compact" || v === "list-item") {
    return (
      <article className={cn("group", className)}>
        <Link href={href} className={cn("flex gap-4", linkClass)}>
          <div className="w-36 shrink-0 sm:w-44">{media}</div>
          {copy}
        </Link>
      </article>
    );
  }

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      <Link href={href} className={cn("flex h-full flex-col", linkClass)}>
        {media}
        {copy}
      </Link>
    </article>
  );
}
