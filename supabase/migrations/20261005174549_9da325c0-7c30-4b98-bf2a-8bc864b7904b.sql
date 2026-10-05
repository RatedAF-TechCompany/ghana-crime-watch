CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;
ALTER TABLE public.story_threads ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

UPDATE public.articles SET content_updated_at = COALESCE(published_at, created_at) WHERE content_updated_at IS NULL;
UPDATE public.story_threads t SET content_updated_at = COALESCE(
  (SELECT max(u.published_at) FROM public.thread_updates u WHERE u.thread_id = t.id), t.live_started_at, t.created_at)
WHERE content_updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_article_content_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_updated_at := COALESCE(NEW.content_updated_at, NEW.published_at, now());
  ELSIF NEW.title IS DISTINCT FROM OLD.title OR NEW.summary IS DISTINCT FROM OLD.summary OR NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.content_updated_at := now();
  ELSE
    NEW.content_updated_at := OLD.content_updated_at;
  END IF;
  IF NEW.published_at IS NOT NULL AND (NEW.content_updated_at IS NULL OR NEW.content_updated_at < NEW.published_at) THEN
    NEW.content_updated_at := NEW.published_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS articles_content_updated_at ON public.articles;
CREATE TRIGGER articles_content_updated_at BEFORE INSERT OR UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.set_article_content_updated_at();

CREATE OR REPLACE FUNCTION public.set_thread_content_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_updated_at := COALESCE(NEW.content_updated_at, NEW.live_started_at, now());
  ELSIF NEW.title IS DISTINCT FROM OLD.title OR NEW.summary IS DISTINCT FROM OLD.summary THEN
    NEW.content_updated_at := now();
  ELSIF NEW.content_updated_at IS DISTINCT FROM OLD.content_updated_at AND current_setting('gc.thread_update', true) = '1' THEN
    NULL;
  ELSE
    NEW.content_updated_at := OLD.content_updated_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS story_threads_content_updated_at ON public.story_threads;
CREATE TRIGGER story_threads_content_updated_at BEFORE INSERT OR UPDATE ON public.story_threads
FOR EACH ROW EXECUTE FUNCTION public.set_thread_content_updated_at();

-- New or edited live updates are content changes to the thread
CREATE OR REPLACE FUNCTION public.bump_thread_on_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.title IS NOT DISTINCT FROM OLD.title AND NEW.body IS NOT DISTINCT FROM OLD.body THEN
    RETURN NEW;
  END IF;
  PERFORM set_config('gc.thread_update', '1', true);
  UPDATE public.story_threads SET content_updated_at = now() WHERE id = NEW.thread_id;
  PERFORM set_config('gc.thread_update', '0', true);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.bump_thread_on_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS thread_updates_bump_thread ON public.thread_updates;
CREATE TRIGGER thread_updates_bump_thread AFTER INSERT OR UPDATE ON public.thread_updates
FOR EACH ROW EXECUTE FUNCTION public.bump_thread_on_update();

-- Remove QA test thread
UPDATE public.articles SET thread_id = NULL WHERE thread_id IN (SELECT id FROM public.story_threads WHERE thread_slug = 'qa-test-developing-story');
UPDATE public.raw_items SET thread_id = NULL WHERE thread_id IN (SELECT id FROM public.story_threads WHERE thread_slug = 'qa-test-developing-story');
UPDATE public.newsroom_articles SET matched_thread_id = NULL WHERE matched_thread_id IN (SELECT id FROM public.story_threads WHERE thread_slug = 'qa-test-developing-story');
DELETE FROM public.thread_updates WHERE thread_id IN (SELECT id FROM public.story_threads WHERE thread_slug = 'qa-test-developing-story');
DELETE FROM public.story_threads WHERE thread_slug = 'qa-test-developing-story';