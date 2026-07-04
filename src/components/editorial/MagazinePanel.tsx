import { Link } from "react-router-dom";
import { EditorialSectionHeading } from "./EditorialSectionHeading";
import { getCategoryLabel } from "@/lib/categories";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  hero_image?: string | null;
  summary?: string | null;
}

export function MagazinePanel({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;
  const [cover, ...supporting] = articles;
  const links = supporting.slice(0, 4);

  return (
    <section>
      <EditorialSectionHeading title="Magazine" moreHref="/magazine" />
      <div className="grid grid-cols-1 gap-8 border-t border-border pt-8 md:grid-cols-12 md:gap-10">
        {/* Cover */}
        <Link
          to={`/${cover.category_slug}/${cover.article_slug}`}
          className="group block md:col-span-3"
        >
          <div
            className="w-full overflow-hidden bg-muted"
            style={{ aspectRatio: "3 / 4", boxShadow: "0 6px 24px hsl(0 0% 0% / 0.08)" }}
          >
            <img
              src={cover.hero_image || FALLBACK_IMAGE_URL}
              alt={cover.hero_image ? "" : FALLBACK_IMAGE_ALT}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </Link>

        {/* Main headline */}
        <Link to={`/${cover.category_slug}/${cover.article_slug}`} className="group block md:col-span-5">
          <p className="author-italic-red mb-3">GhanaCrimes Magazine</p>
          <h3 className="story-title text-[26px] leading-[1.1] group-hover:text-primary sm:text-[32px]">
            {cover.title}
          </h3>
          {cover.summary && (
            <p className="mt-4 font-body text-[16px] leading-[1.6] text-foreground/80">
              {cover.summary}
            </p>
          )}
        </Link>

        {/* Supporting links */}
        <div className="md:col-span-4">
          <ul>
            {links.map((a) => (
              <li key={a.id} className="border-b border-border py-3 last:border-b-0">
                <Link to={`/${a.category_slug}/${a.article_slug}`} className="group block">
                  <p className="author-italic-red mb-1 text-[14px]">{getCategoryLabel(a.category_slug)}</p>
                  <h4 className="story-title text-[16px] leading-[1.2] group-hover:text-primary">
                    {a.title}
                  </h4>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
