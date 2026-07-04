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
 * Returns the image URL to use for an article card / hero.
 * Breaking news articles automatically fall back to the branded
 * GhanaCrimes breaking-news graphic when no hero_image is set.
 */
export function getArticleImage(article: ArticleLike | null | undefined): string | null {
  if (!article) return null;
  if (article.hero_image) return article.hero_image;
  if (isBreakingNews(article)) return BREAKING_NEWS_IMAGE;
  return null;
}
