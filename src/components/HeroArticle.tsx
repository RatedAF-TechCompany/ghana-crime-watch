import Link from "next/link";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";
import { getArticleImage } from "@/lib/article-image";

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
      href={`/${article.category_slug}/${article.article_slug}`}
      className="group block"
    >
      <article className="text-center">
        {/* Italic red byline above headline */}
        <p className="author-italic-red mb-3">GhanaCrimes Newsroom</p>

        <h2 className="story-title mx-auto max-w-[520px] text-[30px] leading-[1.08] sm:text-[38px] lg:text-[44px] group-hover:text-primary">
          {article.title}
        </h2>

        {(() => {
          const img = getArticleImage(article);
          return img ? (
            <div className="mt-4 aspect-[4/5] w-full overflow-hidden">
              <img src={img} alt={article.title} className="h-full w-full object-cover" />
            </div>
          ) : null;
        })()}

        <div className="mt-4 meta-text">
          <span className="cat">{categoryLabel}</span>
          <span className="mx-1.5">|</span>
          <span>{relativeTime}</span>
        </div>
      </article>
    </Link>
  );
}
