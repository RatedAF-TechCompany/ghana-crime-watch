ALTER TABLE public.newsroom_articles DROP CONSTRAINT newsroom_articles_processing_status_check;

ALTER TABLE public.newsroom_articles ADD CONSTRAINT newsroom_articles_processing_status_check 
CHECK (processing_status = ANY (ARRAY['pending', 'processing', 'completed', 'failed', 'duplicate', 'outdated', 'unverified', 'rejected']));