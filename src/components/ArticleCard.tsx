import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime, getReadingTime } from "@/lib/time";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary: string;
    body?: string;
    category_slug: string;
    article_slug: string;
    published_at: string;
    hero_image?: string | null;
  };
  showImage?: boolean;
}

export function ArticleCard({ article, showImage = false }: ArticleCardProps) {
  const categoryLabel = getCategoryLabel(article.category_slug);
  const relativeTime = getRelativeTime(article.published_at);
  const readingTime = article.body ? getReadingTime(article.body) : null;

  return (
    <article className="group border-b border-border py-4">
      <Link
        to={`/${article.category_slug}/${article.article_slug}`}
        className="flex items-start gap-4"
      >
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {article.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide text-primary">{categoryLabel}</span>
            <span>•</span>
            <span>{relativeTime}</span>
            {readingTime && (
              <>
                <span>•</span>
                <span>{readingTime}</span>
              </>
            )}
          </div>
        </div>
        {showImage && article.hero_image && (
          <div className="h-16 w-24 flex-shrink-0 overflow-hidden sm:h-20 sm:w-28">
            <img
              src={article.hero_image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
      </Link>
    </article>
  );
}
