import breakingNewsAsset from "@/assets/breaking-news.png.asset.json";

export const BREAKING_NEWS_IMAGE = breakingNewsAsset.url;

type ArticleLike = {
  hero_image?: string | null;
  category_slug?: string | null;
};

export function isBreakingNews(article: ArticleLike | null | undefined): boolean {
  return article?.category_slug === "breaking-news";
}

/**
 * Strict image policy:
 * - Return the real source-derived hero_image when present.
 * - Otherwise, only breaking-news gets the single provided BREAKING_NEWS_IMAGE.
 * - Every other case returns null. Callers MUST render no <img> when null
 *   (no placeholder, no branded card, no grey box).
 */
export function getArticleImage(article: ArticleLike | null | undefined): string | null {
  if (article?.hero_image) return article.hero_image;
  if (isBreakingNews(article)) return BREAKING_NEWS_IMAGE;
  return null;
}
