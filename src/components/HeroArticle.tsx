import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime, getReadingTime } from "@/lib/time";

interface HeroArticleProps {
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
}

export function HeroArticle({ article }: HeroArticleProps) {
  const categoryLabel = getCategoryLabel(article.category_slug);
  const relativeTime = getRelativeTime(article.published_at);
  const readingTime = article.body ? getReadingTime(article.body) : null;

  return (
    <Link
      to={`/${article.category_slug}/${article.article_slug}`}
      className="group block border-b border-border pb-6"
    >
      <article>
        {article.hero_image && (
          <div className="mb-4 aspect-[16/9] w-full overflow-hidden">
            <img
              src={article.hero_image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <span>{categoryLabel}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{relativeTime}</span>
          {readingTime && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{readingTime}</span>
            </>
          )}
        </div>
        <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl">
          {article.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {article.summary}
        </p>
      </article>
    </Link>
  );
}
