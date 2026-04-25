
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS source_published_at timestamp with time zone;

ALTER TABLE public.newsroom_articles
  ADD COLUMN IF NOT EXISTS source_published_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_articles_source_published_at
  ON public.articles (source_published_at);

CREATE INDEX IF NOT EXISTS idx_newsroom_articles_source_pub
  ON public.newsroom_articles (source_published_at);
