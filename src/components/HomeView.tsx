'use client';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroArticle } from "@/components/HeroArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleCardRail } from "@/components/ArticleCardRail";
import { MostReadArticles } from "@/components/MostReadArticles";
import { EditorialSectionHeading } from "@/components/editorial/EditorialSectionHeading";
import { LiveNowModule } from "@/components/LiveNowModule";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ToolsDataStrip } from "@/components/ToolsDataStrip";
import { RelativeTime } from "@/components/RelativeTime";
import { FollowGhanaCrimes } from "@/components/FollowGhanaCrimes";
import { offenceInfo, regionInfo } from "@/lib/crime-labels";

const ARTICLES_PER_PAGE = 30;

export default function HomeView({ initialArticles }: { initialArticles?: any[] }) {
  const [page, setPage] = useState(0);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-home-editorial", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, body, category_slug, article_slug, published_at, hero_image, region, offence_type")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(page * ARTICLES_PER_PAGE, (page + 1) * ARTICLES_PER_PAGE);
      if (error) throw error;
      return data;
    },
    initialData: page === 0 ? initialArticles : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="aspect-video w-full rounded-[30px]" />
        <div className="flex gap-5 overflow-hidden">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-[240px] shrink-0" />)}
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
  const rail = articles.slice(1, 13);
  const overflow = articles.slice(13);

  return (
    <div className="space-y-14">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">Ghana crime news</h1>

      {/* Breaking: anything published in the last 2 hours */}
      {(() => {
        const breaking = articles.filter((a: any) => a.published_at && Date.now() - new Date(a.published_at).getTime() < 2 * 3600_000).slice(0, 3);
        if (!breaking.length) return null;
        return (
          <section aria-label="Breaking news" className="-mt-8 rounded-md bg-brand px-4 py-3 text-[#141414]">
            <ul className="space-y-1.5">
              {breaking.map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-sans text-xs font-black uppercase tracking-[0.18em]">Breaking</span>
                  <a href={`/${a.category_slug}/${a.article_slug}`} className="font-headline text-lg font-bold leading-snug underline-offset-2 hover:underline">{a.title}</a>
                  <RelativeTime iso={a.published_at} className="font-sans text-xs opacity-90" />
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Live crime wire: newest first, relative times, links to /latest */}
      <section aria-labelledby="just-in" className="border-y border-border py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="just-in" className="flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.16em] text-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden /> Live crime wire
          </h2>
          <Link href="/latest" className="font-sans text-xs font-bold uppercase tracking-wider text-foreground hover:underline">All latest stories &rarr;</Link>
        </div>
        <ol className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {articles.slice(0, 8).map((a: any) => {
            const reg = regionInfo(a.region);
            return (
              <li key={a.id} className="flex gap-3 text-sm">
                {a.published_at && <RelativeTime iso={a.published_at} className="shrink-0 font-sans text-xs tabular-nums text-muted-foreground" />}
                <span className="leading-snug">
                  <a href={`/${a.category_slug}/${a.article_slug}`} className="hover:underline">{a.title}</a>
                  {reg && <span className="ml-1.5 whitespace-nowrap font-sans text-[11px] uppercase tracking-wide text-muted-foreground">{reg.name}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-12">
        {lead && <HeroArticle article={lead} />}
        {rail.length > 0 && (
          <ArticleCardRail title="Latest stories" articles={rail} moreHref="/latest" />
        )}
      </section>

      <ToolsDataStrip />

      {/* Live Now */}
      <LiveNowModule />


      {/* Most popular + Writers */}
      <MostReadArticles />


      {/* By region and by crime type (from the latest stories) */}
      {(() => {
        const byRegion = new Map<string, { name: string; slug: string; items: any[] }>();
        const byType = new Map<string, { label: string; href: string; items: any[] }>();
        for (const a of articles as any[]) {
          const r = regionInfo(a.region); if (r) { const g = byRegion.get(r.slug) ?? { ...r, items: [] }; g.items.push(a); byRegion.set(r.slug, g); }
          const o = offenceInfo(a.offence_type); if (o) { const g = byType.get(o.label) ?? { ...o, items: [] }; g.items.push(a); byType.set(o.label, g); }
        }
        const regions = [...byRegion.values()].sort((x, y) => y.items.length - x.items.length).slice(0, 4);
        const types = [...byType.values()].sort((x, y) => y.items.length - x.items.length).slice(0, 4);
        const block = (title: string, href: string, items: any[]) => (
          <div key={title} className="border-t-2 border-foreground pt-2">
            <Link href={href} className="font-sans text-xs font-bold uppercase tracking-[0.14em] hover:underline">{title} &rarr;</Link>
            <ul className="mt-2 space-y-2">
              {items.slice(0, 3).map((a) => (
                <li key={a.id}><a href={`/${a.category_slug}/${a.article_slug}`} className="font-headline text-sm font-bold leading-snug hover:underline">{a.title}</a></li>
              ))}
            </ul>
          </div>
        );
        return (
          <>
            {types.length > 0 && (
              <section aria-label="By crime type">
                <EditorialSectionHeading title="By crime type" moreHref="/topics" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{types.map((t) => block(t.label, t.href, t.items))}</div>
              </section>
            )}
            {regions.length > 0 && (
              <section aria-label="By region">
                <EditorialSectionHeading title="By region" moreHref="/regions" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{regions.map((r) => block(r.name, `/regions/${r.slug}`, r.items))}</div>
              </section>
            )}
          </>
        );
      })()}

      {/* Follow + tips */}
      <section className="grid gap-6 md:grid-cols-2">
        <FollowGhanaCrimes />
        <div className="rounded-md border border-border p-6">
          <h2 className="font-serif text-2xl font-bold">Seen something? Send us a tip</h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">Tell the GhanaCrimes desk about an arrest, court case, scam or incident. We verify before we publish and protect sources.</p>
          <Link href="/tips" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 font-sans text-sm font-semibold text-[#141414] hover:bg-[#d9cb00]">Send a tip</Link>
        </div>
      </section>

      {/* More headlines */}
      {overflow.length > 0 && (
        <section>
          <EditorialSectionHeading title="More headlines" moreHref="/top-stories" />
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {overflow.map((a) => (
              <ArticleCard key={a.id} article={a} variant="grid" />
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
