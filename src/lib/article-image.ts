import breakingNewsAsset from "@/assets/breaking-news.png.asset.json";

export const BREAKING_NEWS_IMAGE = breakingNewsAsset.url;

/** Only images hosted in our own storage are allowed. Never hot-link other publishers. */
const SELF_HOSTED_PREFIX = "https://zninjnjujptjxdikehun.supabase.co/storage/";

type ArticleLike = {
  hero_image?: string | null;
  category_slug?: string | null;
};

export function isBreakingNews(article: ArticleLike | null | undefined): boolean {
  return article?.category_slug === "breaking-news";
}

export function isSelfHostedImage(url: string | null | undefined): boolean {
  return !!url && (url.startsWith(SELF_HOSTED_PREFIX) || url.startsWith("/"));
}

/**
 * Image policy:
 * - Self-hosted hero_image when present.
 * - breaking-news uses the provided breaking-news graphic.
 * - Everything else returns null so the UI renders a category-coloured text card.
 * Third-party (hot-linked) URLs are never rendered.
 */
export function getArticleImage(article: ArticleLike | null | undefined): string | null {
  const image = article?.hero_image;
  if (isSelfHostedImage(image)) return image ?? null;
  if (isBreakingNews(article)) return BREAKING_NEWS_IMAGE;
  return null;
}
