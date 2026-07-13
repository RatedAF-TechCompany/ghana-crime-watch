-- Story threads: container for a "developing story" with live coverage
CREATE TABLE public.story_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  live_started_at TIMESTAMPTZ,
  live_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.story_threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_story_threads_slug ON public.story_threads(thread_slug);
CREATE INDEX idx_story_threads_live ON public.story_threads(is_live, live_ended_at);

CREATE TRIGGER update_story_threads_updated_at
BEFORE UPDATE ON public.story_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Link articles into a thread's case timeline (no cascade delete of articles)
ALTER TABLE public.articles
ADD COLUMN thread_id UUID REFERENCES public.story_threads(id) ON DELETE SET NULL;

CREATE INDEX idx_articles_thread_id ON public.articles(thread_id);

-- Thread updates: the live-blog entries within a thread
CREATE TABLE public.thread_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.story_threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_key_point BOOLEAN NOT NULL DEFAULT FALSE,
  key_point_label TEXT,
  source_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT key_point_label_valid CHECK (
    (NOT is_key_point OR key_point_label IS NOT NULL)
    AND (key_point_label IS NULL OR char_length(key_point_label) <= 120)
  )
);

ALTER TABLE public.thread_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_thread_updates_thread_published ON public.thread_updates(thread_id, published_at DESC);

-- RLS: story_threads — public read (threads carry no draft concept of their
-- own; visibility of their content is governed by articles/thread_updates).
CREATE POLICY "Story threads are viewable by everyone"
ON public.story_threads FOR SELECT
USING (true);

CREATE POLICY "Editors and admins can create story threads"
ON public.story_threads FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Editors and admins can update story threads"
ON public.story_threads FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can delete story threads"
ON public.story_threads FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: thread_updates — public read; write restricted to admin/editor only
-- (deliberately excludes 'contributor', unlike articles). Live-blog updates
-- post directly to a public live page with no draft/review state and can
-- trigger an automatic tweet, so this is higher-trust content than a
-- drafted article.
CREATE POLICY "Thread updates are viewable by everyone"
ON public.thread_updates FOR SELECT
USING (true);

CREATE POLICY "Editors and admins can create thread updates"
ON public.thread_updates FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Editors and admins can update thread updates"
ON public.thread_updates FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can delete thread updates"
ON public.thread_updates FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
