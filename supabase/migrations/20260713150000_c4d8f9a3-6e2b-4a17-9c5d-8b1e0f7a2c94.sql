-- thread_updates INSERTs must broadcast over Supabase Realtime so the live
-- page's "new update - tap to show" banner can pick them up. Tables are not
-- included in the supabase_realtime publication by default, so this must be
-- added explicitly.
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_updates;
