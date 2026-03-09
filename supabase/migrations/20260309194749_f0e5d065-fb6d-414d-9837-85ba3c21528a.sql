
-- Table to track processed tweets (duplicate protection)
CREATE TABLE public.processed_tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id text NOT NULL UNIQUE,
  author_username text NOT NULL,
  tweet_text text NOT NULL,
  tweet_created_at timestamp with time zone,
  generated_article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  processing_status text NOT NULL DEFAULT 'pending',
  error_message text,
  tweet_media_urls text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table to log ingestion events
CREATE TABLE public.ingestion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.processed_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/editors can view
CREATE POLICY "Admins and editors can view processed tweets"
  ON public.processed_tweets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can view ingestion logs"
  ON public.ingestion_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Service role handles inserts (edge functions use service role key)
CREATE POLICY "Service role manages processed tweets"
  ON public.processed_tweets FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Service role manages ingestion logs"
  ON public.ingestion_logs FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
