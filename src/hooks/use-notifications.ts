import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    setIsSupported(true);
    setPermission(Notification.permission);

    // Check if user has subscribed
    const subscribed = localStorage.getItem("ghanacrimes_notifications") === "true";
    setIsSubscribed(subscribed);

    // Get last notified article ID
    const lastId = localStorage.getItem("ghanacrimes_last_notified");
    setLastNotifiedId(lastId);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Your browser doesn't support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        localStorage.setItem("ghanacrimes_notifications", "true");
        setIsSubscribed(true);
        toast.success("You'll now receive breaking news alerts!");
        return true;
      } else if (result === "denied") {
        toast.error("Notifications blocked. Enable them in browser settings.");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ghanacrimes_notifications");
    }
    setIsSubscribed(false);
    toast.success("Notifications disabled");
  }, []);

  const showNotification = useCallback((article: Article) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (permission !== "granted" || !isSubscribed) return;

    // Don't show if we already notified for this article
    if (lastNotifiedId === article.id) return;

    const notification = new Notification("🚨 Breaking News - GhanaCrimes", {
      body: article.title,
      icon: "/favicon.ico",
      tag: article.id,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = `/${article.category_slug}/${article.article_slug}`;
      notification.close();
    };

    // Store last notified ID
    localStorage.setItem("ghanacrimes_last_notified", article.id);
    setLastNotifiedId(article.id);
  }, [permission, isSubscribed, lastNotifiedId]);

  // Listen for new breaking news articles
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSubscribed || permission !== "granted") return;

    const channel = supabase
      .channel("breaking-news-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "articles",
          filter: "is_published=eq.true",
        },
        (payload) => {
          const article = payload.new as Article;
          // Only notify for breaking news category
          if (article.category_slug === "breaking-news") {
            showNotification(article);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSubscribed, permission, showNotification]);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    unsubscribe,
    showNotification,
  };
}
