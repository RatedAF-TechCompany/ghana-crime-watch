import breakingNewsAsset from "@/assets/breaking-news.png.asset.json";
import placeholderDefault from "@/assets/placeholder-default.jpg";
import placeholderCourt from "@/assets/placeholder-court.jpg";
import placeholderPolice from "@/assets/placeholder-police.jpg";
import placeholderCyber from "@/assets/placeholder-cyber.jpg";

export const BREAKING_NEWS_IMAGE = breakingNewsAsset.url;
export const DEFAULT_PLACEHOLDER = placeholderDefault;

// Category → branded placeholder. Every slug in src/lib/categories.ts is
// mapped explicitly so no article ever renders a blank grey box.
const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "top-stories": placeholderDefault,
  "violent-crime": placeholderPolice,
  "property-crime": placeholderPolice,
  "cybercrime": placeholderCyber,
  "fraud-scams": placeholderCyber,
  "drug-offences": placeholderPolice,
  "domestic-violence": placeholderPolice,
  "traffic-offences": placeholderPolice,
  "youth-crime": placeholderPolice,
  "organised-crime": placeholderPolice,
  "white-collar-crime": placeholderCourt,
  "police-reports": placeholderPolice,
  "court-cases": placeholderCourt,
  "prison-news": placeholderCourt,
  "crime-prevention": placeholderDefault,
  "crime-statistics": placeholderDefault,
  "investigations": placeholderDefault,
  "most-wanted": placeholderPolice,
};

export function categoryPlaceholder(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  return CATEGORY_PLACEHOLDERS[slug];
}

type ArticleLike = {
  hero_image?: string | null;
  category_slug?: string | null;
};

export function isBreakingNews(article: ArticleLike | null | undefined): boolean {
  return article?.category_slug === "breaking-news";
}

/**
 * Returns an image URL for an article card / hero. Never returns null:
 * falls through to a branded category placeholder, then a neutral default.
 */
export function getArticleImage(article: ArticleLike | null | undefined): string {
  if (article?.hero_image) return article.hero_image;
  if (isBreakingNews(article)) return BREAKING_NEWS_IMAGE;
  return categoryPlaceholder(article?.category_slug ?? undefined) ?? DEFAULT_PLACEHOLDER;
}
