-- Track when the newsroom pipeline auto-matches a scraped item to an
-- already-live developing story thread, for audit/oversight (mirrors how
-- rejected_items already audits scope/duplicate gate decisions).
ALTER TABLE public.newsroom_articles
  ADD COLUMN matched_thread_id UUID REFERENCES public.story_threads(id) ON DELETE SET NULL;

ALTER TABLE public.newsroom_articles DROP CONSTRAINT newsroom_articles_processing_status_check;
ALTER TABLE public.newsroom_articles ADD CONSTRAINT newsroom_articles_processing_status_check
CHECK (processing_status = ANY (ARRAY['pending', 'processing', 'completed', 'failed', 'duplicate', 'outdated', 'unverified', 'rejected', 'thread_update']));
