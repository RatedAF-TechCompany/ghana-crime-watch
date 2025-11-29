import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary: string;
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

  return (
    <article className="group border-b border-border py-4">
      <Link
        to={`/${article.category_slug}/${article.article_slug}`}
        className="flex gap-4"
      >
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-bold leading-tight transition-colors group-hover:text-primary">
            {article.title}
          </h3>
          <p className="mb-2 text-xs text-foreground">
            {categoryLabel} • {relativeTime}
          </p>
          <p className="text-sm leading-snug text-muted-foreground line-clamp-2">
            {article.summary}
          </p>
        </div>
        {showImage && article.hero_image && (
          <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded">
            <img
              src={article.hero_image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}
      </Link>
    </article>
  );
}
