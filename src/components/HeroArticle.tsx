import { Link } from "react-router-dom";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";

interface HeroArticleProps {
  article: {
    id: string;
    title: string;
    summary: string;
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
      className="group mb-8 block"
    >
      <article>
        {article.hero_image && (
          <div className="mb-4 aspect-[16/9] w-full overflow-hidden rounded">
            <img
              src={article.hero_image}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <p className="mb-2 text-sm font-medium text-primary">
          {categoryLabel} • {relativeTime}
        </p>
        <h1 className="mb-3 text-3xl font-bold leading-tight text-primary transition-colors group-hover:opacity-80 md:text-4xl">
          {article.title}
        </h1>
        <p className="text-base leading-relaxed text-foreground">
          {article.summary}
        </p>
      </article>
    </Link>
  );
}
