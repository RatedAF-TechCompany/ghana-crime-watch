import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";

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

  return (
    <Link
      to={`/${article.category_slug}/${article.article_slug}`}
      className="group block"
    >
      <article>
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          {article.hero_image ? (
            <img
              src={article.hero_image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-white">
              <span className="font-display text-4xl tracking-tight">GhanaCrimes</span>
            </div>
          )}
        </div>
        <div className="pt-4">
          <h2 className="story-title text-2xl leading-[1.15] sm:text-[28px] lg:text-[32px] group-hover:text-primary">
            {article.title}
          </h2>
          <div className="mt-3 meta-text">
            <span>{relativeTime}</span>
            <span className="mx-1.5">|</span>
            <span className="uppercase tracking-wide font-semibold text-primary">{categoryLabel}</span>
          </div>
          {article.summary && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
