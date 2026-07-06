'use client';
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { getCategoryLabel } from "@/lib/categories";
import { getRelativeTime } from "@/lib/time";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];

      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, category_slug, article_slug, published_at")
        .eq("is_published", true)
        .or(`title.ilike.%${debouncedQuery}%,summary.ilike.%${debouncedQuery}%,body.ilike.%${debouncedQuery}%`)
        .order("published_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Search Articles</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-transparent"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="search"
            placeholder="Search by title, summary, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            autoFocus
          />

          {debouncedQuery && (
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Searching...
                </p>
              ) : results && results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((article) => (
                    <Link
                      key={article.id}
                      href={`/${article.category_slug}/${article.article_slug}`}
                      onClick={onClose}
                      className="block rounded border border-border p-3 transition-colors hover:bg-muted"
                    >
                      <h4 className="mb-1 font-semibold">{article.title}</h4>
                      <p className="mb-1 text-xs text-muted-foreground">
                        {getCategoryLabel(article.category_slug)} •{" "}
                        {getRelativeTime(article.published_at)}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No results found
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
