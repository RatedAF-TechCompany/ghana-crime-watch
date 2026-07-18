ALTER TABLE public.processed_tweets
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS processed_tweets_status_attempt_idx
  ON public.processed_tweets (processing_status, last_attempt_at);
