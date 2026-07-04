import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { EditorialSectionHeading } from "./EditorialSectionHeading";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  hero_image?: string | null;
}

export function GhanaCrimesTV({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;
  const [feature, ...rest] = articles;
  const smalls = rest.slice(0, 2);

  return (
    <section>
      <EditorialSectionHeading title="GhanaCrimes TV" moreHref="/top-stories" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <VideoBlock article={feature} large />
        <div className="grid grid-cols-1 gap-4">
          {smalls.map((a) => <VideoBlock key={a.id} article={a} />)}
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ article, large = false }: { article: Article; large?: boolean }) {
  return (
    <Link
      to={`/${article.category_slug}/${article.article_slug}`}
      className="group relative block overflow-hidden bg-dark-panel"
      style={{ aspectRatio: large ? "16 / 11" : "16 / 9" }}
    >
      {article.hero_image && (
        <img
          src={article.hero_image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-70"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
        <h3
          className="story-title text-white group-hover:text-white/90"
          style={{ fontSize: large ? "24px" : "17px", lineHeight: 1.2 }}
        >
          {article.title}
        </h3>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground"
        >
          <Play className="h-4 w-4 fill-current" />
        </span>
      </div>
    </Link>
  );
}
