ALTER TABLE public.processed_tweets
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS processed_tweets_status_attempts_idx
  ON public.processed_tweets (processing_status, attempts);
