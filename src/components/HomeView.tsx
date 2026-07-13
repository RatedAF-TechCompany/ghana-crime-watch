'use client';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { MostReadArticles } from "@/components/MostReadArticles";
import { EditorialSectionHeading } from "@/components/editorial/EditorialSectionHeading";
import { GhanaCrimesTV } from "@/components/editorial/GhanaCrimesTV";
import { MagazinePanel } from "@/components/editorial/MagazinePanel";
import { ColumnsSection } from "@/components/editorial/ColumnsSection";
import { PodcastsPanel } from "@/components/editorial/PodcastsPanel";
import { CartoonSection } from "@/components/editorial/CartoonSection";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { AdBanner } from "@/components/AdBanner";
import { LiveNowModule } from "@/components/LiveNowModule";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";
import { ArrowUpRight } from "lucide-react";

const ARTICLES_PER_PAGE = 30;

export default function HomeView() {
  const [page, setPage] = useState(0);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-home-editorial", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, body, category_slug, article_slug, published_at, hero_image")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(page * ARTICLES_PER_PAGE, (page + 1) * ARTICLES_PER_PAGE);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="aspect-[4/5] w-full lg:col-span-6" />
          <div className="lg:col-span-3 space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="section-title-serif mb-2">No articles yet</h2>
        <p className="font-body text-muted-fg">Check back soon for GhanaCrimes updates.</p>
      </div>
    );
  }

  const lead = articles[0];
  const leftStack = articles.slice(1, 4);
  const rightList = articles.slice(4, 10);
  const tv = articles.slice(10, 13);
  const magazine = articles.slice(13, 18);
  const columns = articles.slice(18, 20);
  const podcasts = articles.slice(20, 23);
  const cartoon = articles.slice(23, 26);
  const overflow = articles.slice(26);

  return (
    <div className="space-y-14">
      {/* Three-column front page */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left: stacked secondaries */}
        <div className="order-3 space-y-2 lg:order-1 lg:col-span-3">
          {leftStack.map((a) => (
            <ArticleCard key={a.id} article={a} variant="stacked" />
          ))}
        </div>

        {/* Centre: lead cover story */}
        <div className="order-1 lg:order-2 lg:col-span-6">
          {lead && <HeroArticle article={lead} />}
        </div>

        {/* Right: Latest from GhanaCrimes */}
        <aside className="order-2 lg:order-3 lg:col-span-3">
          <div className="red-double-rule pt-3">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="section-heading">Latest from GhanaCrimes</h3>
              <Link
                href="/top-stories"
                aria-label="More latest"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </div>
            <ul>
              {rightList.map((a) => (
                <li key={a.id} className="border-b border-border py-3.5 last:border-b-0">
                  <Link href={`/${a.category_slug}/${a.article_slug}`} className="group block">
                    <p className="author-italic-red mb-1 text-[14px]">
                      {getCategoryLabel(a.category_slug)}
                    </p>
                    <h4 className="story-title text-[16px] leading-[1.2] group-hover:text-primary">
                      {a.title}
                    </h4>
                    <div className="mt-1 meta-text">
                      <span>{getRelativeTime(a.published_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Live Now */}
      <LiveNowModule />

      {/* Ad slot */}
      <div className="mx-auto max-w-3xl">
        <AdBanner slotId={0} probability={1} />
      </div>

      {/* Most popular + Writers */}
      <MostReadArticles />

      {/* GhanaCrimes TV */}
      <GhanaCrimesTV articles={tv} />

      {/* Magazine */}
      <MagazinePanel articles={magazine} />

      {/* Newsletter band */}
      <div><NewsletterSignup /></div>

      {/* Columns */}
      <ColumnsSection articles={columns} />

      {/* Podcasts */}
      <PodcastsPanel articles={podcasts} />

      {/* Cartoon / quotes */}
      <CartoonSection articles={cartoon} />

      {/* More headlines */}
      {overflow.length > 0 && (
        <section>
          <EditorialSectionHeading title="More headlines" moreHref="/top-stories" />
          <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
            {overflow.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 pt-4">
        {page > 0 && (
          <Button variant="outline" onClick={() => setPage(page - 1)} className="border-foreground/20">
            Previous
          </Button>
        )}
        {articles.length >= ARTICLES_PER_PAGE && (
          <Button variant="outline" onClick={() => setPage(page + 1)} className="border-foreground/20">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
