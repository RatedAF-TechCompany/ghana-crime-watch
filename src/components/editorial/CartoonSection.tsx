import { Link } from "react-router-dom";
import { EditorialSectionHeading } from "./EditorialSectionHeading";
import { getCategoryLabel } from "@/lib/categories";

interface Article {
  id: string;
  title: string;
  summary?: string | null;
  category_slug: string;
  article_slug: string;
}

export function CartoonSection({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;
  const items = articles.slice(0, 3);

  return (
    <section>
      <EditorialSectionHeading title="Cartoon" moreHref="/top-stories" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:divide-x md:divide-border">
        {items.map((a, i) => (
          <Link
            key={a.id}
            to={`/${a.category_slug}/${a.article_slug}`}
            className={`group block ${i > 0 ? "md:pl-8" : ""} ${i < items.length - 1 ? "md:pr-8" : ""}`}
          >
            <p className="author-italic-red mb-2 text-[13px]">{getCategoryLabel(a.category_slug)}</p>
            <blockquote className="story-title text-[20px] italic leading-[1.25] group-hover:text-primary sm:text-[22px]">
              &ldquo;{a.title}&rdquo;
            </blockquote>
          </Link>
        ))}
      </div>
    </section>
  );
}
