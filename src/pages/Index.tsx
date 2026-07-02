import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { MostReadArticles } from "@/components/MostReadArticles";
import { SectionHeading } from "@/components/broadcast/SectionHeading";
import { StoryGrid } from "@/components/broadcast/StoryGrid";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { WhatsAppChannelCTA } from "@/components/WhatsAppChannelCTA";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, Search } from "lucide-react";
import { Link } from "react-router-dom";

const ARTICLES_PER_PAGE = 21; // 1 lead + 2 secondary + 4 + 4 + spare

export default function Index() {
  const [page, setPage] = useState(0);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-home", page],
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
      <div className="space-y-8">
        <Skeleton className="aspect-[16/9] w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 section-heading">No Articles Yet</h2>
        <p className="text-muted-foreground">Check back soon for crime news updates.</p>
      </div>
    );
  }

  const lead = articles[0];
  const secondary = articles.slice(1, 3);
  const grid1 = articles.slice(3, 7);
  const grid2 = articles.slice(7, 11);
  const grid3 = articles.slice(11, 15);
  const overflow = articles.slice(15);

  return (
    <div className="space-y-10">
      {/* Fraud Watch compact strip */}
      <div className="flex flex-col items-start justify-between gap-3 border-l-4 border-primary bg-muted px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-foreground">
              Fraud Watch
            </p>
            <p className="text-sm text-muted-foreground">
              Search suspicious accounts or report a scammer before you send money.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-8 sm:pl-0">
          <Link to="/fraud-watch">
            <Button size="sm" variant="outline" className="gap-1.5 border-foreground/20">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
          </Link>
          <Link to="/fraud-watch/report">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <AlertTriangle className="h-3.5 w-3.5" />
              Report
            </Button>
          </Link>
        </div>
      </div>

      {/* TOP STORIES — asymmetric lead */}
      <section>
        <SectionHeading title="Top Stories" moreHref="/top-stories" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {lead && <HeroArticle article={lead} />}
          </div>
          <div className="flex flex-col gap-6 lg:col-span-4">
            {secondary.map((a) => (
              <ArticleCard key={a.id} article={a} variant="secondary" />
            ))}
          </div>
        </div>
      </section>

      {/* Ad slot */}
      <div className="mx-auto max-w-3xl">
        <AdBanner slotId={0} probability={1} />
      </div>

      {/* GHANA CRIME STORIES */}
      {grid1.length > 0 && (
        <section>
          <SectionHeading title="Ghana Crime Stories" moreHref="/violent-crime" />
          <StoryGrid>
            {grid1.map((a) => (
              <ArticleCard key={a.id} article={a} variant="grid" />
            ))}
          </StoryGrid>
        </section>
      )}

      {/* WhatsApp CTA band */}
      <div>
        <WhatsAppChannelCTA variant="banner" />
      </div>

      {/* MORE GHANA STORIES */}
      {grid2.length > 0 && (
        <section>
          <SectionHeading title="More Ghana Stories" />
          <StoryGrid>
            {grid2.map((a) => (
              <ArticleCard key={a.id} article={a} variant="grid" />
            ))}
          </StoryGrid>
        </section>
      )}

      {/* Newsletter band */}
      <div>
        <NewsletterSignup />
      </div>

      {/* MOST READ */}
      <MostReadArticles />

      {/* Third grid — LATEST */}
      {grid3.length > 0 && (
        <section>
          <SectionHeading title="Latest Updates" />
          <StoryGrid>
            {grid3.map((a) => (
              <ArticleCard key={a.id} article={a} variant="grid" />
            ))}
          </StoryGrid>
        </section>
      )}

      {/* Overflow compact list */}
      {overflow.length > 0 && (
        <section>
          <SectionHeading title="More Headlines" />
          <div>
            {overflow.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 pt-4">
        {page > 0 && (
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            className="border-foreground/20"
          >
            Previous
          </Button>
        )}
        {articles.length >= ARTICLES_PER_PAGE && (
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            className="border-foreground/20"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
