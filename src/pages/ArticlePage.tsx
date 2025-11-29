import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";
import { Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";
import { useState } from "react";
import { toast } from "sonner";

export default function ArticlePage() {
  const { categorySlug, articleSlug } = useParams<{
    categorySlug: string;
    articleSlug: string;
  }>();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", categorySlug, articleSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category_slug", categorySlug!)
        .eq("article_slug", articleSlug!)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug && !!articleSlug,
  });

  const handleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please log in to bookmark articles");
      return;
    }

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("article_id", article!.id);
      setIsBookmarked(false);
      toast.success("Bookmark removed");
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, article_id: article!.id });
      setIsBookmarked(true);
      toast.success("Article bookmarked");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article!.title,
        text: article!.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold">Article Not Found</h2>
        <p className="text-muted-foreground">The article you're looking for doesn't exist.</p>
      </div>
    );
  }

  const categoryLabel = getCategoryLabel(article.category_slug);
  const relativeTime = getRelativeTime(article.published_at!);

  // Add mark tags to numbers for highlight effect
  const processBodyText = (body: string) => {
    return body.replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g, '<mark>$1</mark>');
  };

  const sanitizedBody = DOMPurify.sanitize(processBodyText(article.body), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'mark'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <article>
      {article.hero_image && (
        <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded">
          <img
            src={article.hero_image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-primary">
          {categoryLabel} • {relativeTime}
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBookmark}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">
        {article.title}
      </h1>

      {article.subtitle && (
        <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
          {article.subtitle}
        </h2>
      )}

      <p className="mb-2 text-sm text-muted-foreground">
        By {article.author_name || "GhanaCrimes Staff"}
      </p>

      <div
        className="article-body prose prose-lg max-w-none py-6"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />

      {article.tags && article.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
