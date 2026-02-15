-- Add twitter_post column to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS twitter_post text;

-- Add comment for clarity
COMMENT ON COLUMN public.articles.twitter_post IS 'Stores suggested tweet text. Prefixed with POSTED:{tweetId}| after successful posting.';