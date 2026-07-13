-- Add twitter_post tracking to thread_updates, mirroring articles.twitter_post,
-- so the auto-tweet function can apply the same POSTED: marker convention
-- and the same global rate-limit check across both tables.
ALTER TABLE public.thread_updates
ADD COLUMN twitter_post TEXT;
