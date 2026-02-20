import { useQuery } from "@tanstack/react-query";
import { useShouldShowAd } from "@/components/AdBanner";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { MostReadArticles } from "@/components/MostReadArticles";
import { CrimeDashboard } from "@/components/CrimeDashboard";

import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { WhatsAppChannelCTA } from "@/components/WhatsAppChannelCTA";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, Search } from "lucide-react";
import { Link } from "react-router-dom";

const ARTICLES_PER_PAGE = 10;

export default function Index() {
  const [page, setPage] = useState(0);
  const sidebarShowAd = useShouldShowAd(2, 0.7);

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
      
      {/* Fraud Watch Banner */}
      <div className="mt-6">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-serif font-bold text-foreground text-base leading-snug">
                  Fraud Watch — Protect Yourself Online
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Search for suspicious accounts or report a scammer before you send money.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pl-9 sm:pl-0">
              <Link to="/fraud-watch">
                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/40 gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </Button>
              </Link>
              <Link to="/fraud-watch/report">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Report
                </Button>
              </Link>
            </div>
          </div>
        </div>
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

           {/* WhatsApp Channel CTA - Mobile Only (after first 3 articles, hidden when ad shows) */}
          <div className="my-6 lg:hidden">
            <WhatsAppChannelCTA variant="banner" />
          </div>

          {/* Crime Dashboard - Mobile Only (appears inline on mobile) */}
          <div className="my-6 lg:hidden">
            <CrimeDashboard />
          </div>

          {/* Ad Banner - between article sections, max half-width */}
          <div className="my-6 max-w-xs">
            <AdBanner slotId={0} probability={1} />
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
            {/* WhatsApp CTA or Sidebar Ad - mutually exclusive */}
            {sidebarShowAd ? (
              <AdBanner slotId={2} probability={1} />
            ) : (
              <WhatsAppChannelCTA variant="banner" />
            )}
            
            {/* Newsletter Signup */}
            <NewsletterSignup />
            
            {/* Most Read Section */}
            <MostReadArticles />

            {/* Crime Dashboard */}
            <CrimeDashboard />

          </div>
        </aside>
      </div>

      {/* Mobile Only */}
      <div className="mt-6 space-y-6 lg:hidden">
        <NewsletterSignup />
        <MostReadArticles />
      </div>
    </div>
  );
}
