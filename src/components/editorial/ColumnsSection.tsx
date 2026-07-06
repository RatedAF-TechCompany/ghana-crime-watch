import Link from "next/link";
import { EditorialSectionHeading } from "./EditorialSectionHeading";
import { getCategoryLabel } from "@/lib/categories";

interface Article {
  id: string;
  title: string;
  summary?: string | null;
  category_slug: string;
  article_slug: string;
}

export function ColumnsSection({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;
  const items = articles.slice(0, 2);

  return (
    <section>
      <EditorialSectionHeading title="Columns" moreHref="/top-stories" />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:divide-x md:divide-border">
        {items.map((a, i) => (
          <Link
            key={a.id}
            href={`/${a.category_slug}/${a.article_slug}`}
            className={`group block ${i === 1 ? "md:pl-10" : "md:pr-10"}`}
          >
            <p className="author-italic-red mb-2">{getCategoryLabel(a.category_slug)}</p>
            <h3 className="story-title text-[24px] leading-[1.15] group-hover:text-primary sm:text-[28px]">
              {a.title}
            </h3>
            {a.summary && (
              <p className="mt-4 font-body text-[16px] leading-[1.6] text-foreground/80">
                {a.summary}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
