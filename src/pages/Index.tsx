import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { MostReadArticles } from "@/components/MostReadArticles";
import { CrimeDashboard } from "@/components/CrimeDashboard";
import { CrimeMap } from "@/components/CrimeMap";
import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { WhatsAppChannelCTA } from "@/components/WhatsAppChannelCTA";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ARTICLES_PER_PAGE = 10;

export default function Index() {
  const [page, setPage] = useState(0);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", page],
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
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/9] w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2 border-b border-border py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 font-serif text-2xl font-bold">No Articles Yet</h2>
        <p className="text-muted-foreground">Check back soon for crime news updates.</p>
      </div>
    );
  }

  const [heroArticle, ...restArticles] = articles;

  // Split articles for strategic placement
  const topArticles = restArticles.slice(0, 3);
  const remainingArticles = restArticles.slice(3);

  return (
    <div>
      {/* Breaking News Ticker */}
      <BreakingNewsTicker />

      {/* Hero Article - Full Width */}
      <div className="mt-6">
        {heroArticle && <HeroArticle article={heroArticle} />}
      </div>
      
      {/* Two-Column Layout: Articles + Sidebar */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Main Content - Articles */}
        <div className="lg:col-span-8">
          {/* Top Articles */}
          <div className="space-y-0">
            {topArticles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                showImage={index === 0}
              />
            ))}
          </div>

          {/* WhatsApp Channel CTA - Mobile Only (after first 3 articles) */}
          <div className="my-6 lg:hidden">
            <WhatsAppChannelCTA variant="banner" />
          </div>

          {/* Crime Dashboard - Mobile Only (appears inline on mobile) */}
          <div className="my-6 lg:hidden">
            <CrimeDashboard />
          </div>

          {/* Ad Banner - between article sections */}
          <div className="my-6">
            <AdBanner slotId={1} probability={1} />
          </div>

          {/* Remaining Articles */}
          <div className="space-y-0">
            {remainingArticles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                showImage={(index + 1) % 4 === 0}
              />
            ))}
          </div>

          {/* Pagination */}
          {articles.length === ARTICLES_PER_PAGE + 1 && (
            <div className="mt-8 flex justify-center gap-4">
              {page > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setPage(page - 1)}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Previous
                </Button>
              )}
              {articles.length === ARTICLES_PER_PAGE + 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setPage(page + 1)}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Next
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-20 space-y-6">
            {/* WhatsApp Channel CTA */}
            <WhatsAppChannelCTA variant="banner" />
            
            {/* Newsletter Signup */}
            <NewsletterSignup />
            
            {/* Most Read Section */}
            <MostReadArticles />
            
            {/* Sidebar Ad */}
            <AdBanner slotId={2} probability={0.7} />

            {/* Crime Dashboard */}
            <CrimeDashboard />

            {/* Crime Map */}
            <CrimeMap />
          </div>
        </aside>
      </div>

      {/* Mobile Only */}
      <div className="mt-6 space-y-6 lg:hidden">
        <NewsletterSignup />
        <MostReadArticles />
        <CrimeMap />
      </div>
    </div>
  );
}
