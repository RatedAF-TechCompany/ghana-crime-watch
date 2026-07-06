import Link from "next/link";
import { Mic } from "lucide-react";
import { EditorialSectionHeading } from "./EditorialSectionHeading";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  hero_image?: string | null;
}

export function PodcastsPanel({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;
  const [feature, ...rest] = articles;
  const smalls = rest.slice(0, 2);

  return (
    <section>
      <EditorialSectionHeading title="Podcasts" moreHref="/top-stories" />
      <div className="bg-dark-panel p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <PodcastBlock article={feature} large />
          <div className="grid grid-cols-1 gap-6">
            {smalls.map((a) => <PodcastBlock key={a.id} article={a} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function PodcastBlock({ article, large = false }: { article: Article; large?: boolean }) {
  return (
    <Link
      href={`/${article.category_slug}/${article.article_slug}`}
      className="group flex items-start gap-4"
    >
      <div
        className="shrink-0 overflow-hidden bg-black"
        style={{ width: large ? 160 : 110, height: large ? 160 : 110 }}
      >
        {article.hero_image ? (
          <img src={article.hero_image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Mic className="h-8 w-8 text-white/60" strokeWidth={1.2} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-headline text-[13px] italic text-primary">GhanaCrimes Podcasts</p>
        <h3
          className="story-title text-white group-hover:text-white/85"
          style={{ fontSize: large ? "22px" : "17px", lineHeight: 1.2 }}
        >
          {article.title}
        </h3>
      </div>
    </Link>
  );
}
