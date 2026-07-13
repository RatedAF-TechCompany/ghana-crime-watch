import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ThreadUpdateRow {
  id: string;
  thread_id: string;
  title: string;
  body: string;
  is_key_point: boolean;
  key_point_label: string | null;
  source_article_id: string | null;
  published_at: string;
}

export function useThreadUpdatesRealtime(threadId: string | undefined) {
  const [pendingUpdates, setPendingUpdates] = useState<ThreadUpdateRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !threadId) return;

    const channel = supabase
      .channel(`thread-updates-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_updates",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          setPendingUpdates((prev) => [payload.new as ThreadUpdateRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const clearPending = useCallback(() => setPendingUpdates([]), []);

  return { pendingUpdates, clearPending };
}
