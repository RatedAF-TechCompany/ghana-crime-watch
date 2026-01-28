import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookmarkButtonProps {
  articleId: string;
  variant?: "ghost" | "outline";
  size?: "icon" | "sm" | "default";
}

export function BookmarkButton({ articleId, variant = "ghost", size = "icon" }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkBookmarkStatus();
  }, [articleId]);

  const checkBookmarkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("article_id", articleId)
      .maybeSingle();

    setIsBookmarked(!!data);
  };

  const handleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please log in to bookmark articles");
      return;
    }

    setIsLoading(true);

    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("article_id", articleId);
        setIsBookmarked(false);
        toast.success("Bookmark removed");
      } else {
        await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, article_id: articleId });
        setIsBookmarked(true);
        toast.success("Article bookmarked");
      }
    } catch (error) {
      console.error("Bookmark error:", error);
      toast.error("Failed to update bookmark");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBookmark}
      disabled={isLoading}
      className={isBookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"}
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
    >
      <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-current" : ""}`} />
    </Button>
  );
}
