import Link from "next/link";
import { getCategoryLabel } from "@/lib/categories";
import { getPublishedTime } from "@/lib/time";
import { getArticleImage } from "@/lib/article-image";

interface HeroArticleProps {
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
}

export function HeroArticle({ article }: HeroArticleProps) {
  const categoryLabel = getCategoryLabel(article.category_slug);
  const publishedTime = getPublishedTime(article.published_at);
  const imageUrl = getArticleImage(article);
  const summary = (article.summary || "").trim();

  return (
    <Link
      href={`/${article.category_slug}/${article.article_slug}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffef00]"
    >
      <article className="relative overflow-hidden rounded-[30px] bg-[#141414] text-white">
        <div className={imageUrl ? "relative aspect-video w-full" : "relative"}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          )}
          {imageUrl && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />}
          <div className={imageUrl
            ? "absolute inset-x-0 bottom-0 z-[1] flex flex-col items-start p-5 sm:p-8 md:max-w-4xl md:p-10"
            : "relative z-[1] flex flex-col items-start p-6 sm:p-8 md:max-w-4xl md:p-10"}>
            <p className="mb-3 inline-block bg-[#ffef00] px-2 py-0.5 font-sans text-[12px] font-semibold uppercase leading-4 tracking-[0.08em] text-[#141414]">
              {categoryLabel}
            </p>
            <h2 className="font-headline text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-white transition-opacity duration-200 group-hover:opacity-80 sm:text-[36px] lg:text-[42px]">
              {article.title}
            </h2>
            {summary && (
              <p className="mt-3 line-clamp-2 max-w-2xl font-sans text-[15px] font-light leading-snug text-white/85">
                {summary}
              </p>
            )}
            {publishedTime && (
              <time dateTime={article.published_at} className="mt-3 font-sans text-sm font-light text-white/75">
                {publishedTime}
              </time>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
