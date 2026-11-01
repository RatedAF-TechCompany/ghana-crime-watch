BEGIN;
-- Developing-story update system for article pages (BBC-style "Updated HH:MM" + update box).
-- Reuses existing articles.content_updated_at, source_url/source_urls and story_threads/thread_updates.
-- Idempotent: safe to run more than once.

ALTER TABLE ghanacrimes.articles ADD COLUMN IF NOT EXISTS story_key TEXT;  -- entity|event|place|YYYY-MM
CREATE INDEX IF NOT EXISTS idx_articles_story_key ON ghanacrimes.articles(story_key);
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON ghanacrimes.articles(source_url);

-- Same trigger as 20261005174549, plus: add_story_update may bump content_updated_at
-- without a title/summary/body change (session flag gc.story_update = '1').
CREATE OR REPLACE FUNCTION ghanacrimes.set_article_content_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = ghanacrimes, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_updated_at := COALESCE(NEW.content_updated_at, NEW.published_at, now());
  ELSIF NEW.title IS DISTINCT FROM OLD.title OR NEW.summary IS DISTINCT FROM OLD.summary OR NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.content_updated_at := now();
  ELSIF NEW.content_updated_at IS DISTINCT FROM OLD.content_updated_at AND current_setting('gc.story_update', true) = '1' THEN
    NULL;
  ELSE
    NEW.content_updated_at := OLD.content_updated_at;
  END IF;
  IF NEW.published_at IS NOT NULL AND (NEW.content_updated_at IS NULL OR NEW.content_updated_at < NEW.published_at) THEN
    NEW.content_updated_at := NEW.published_at;
  END IF;
  RETURN NEW;
END $$;

-- 1) Update records
CREATE TABLE IF NOT EXISTS ghanacrimes.story_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES ghanacrimes.articles(id) ON DELETE CASCADE,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  headline_change TEXT,
  summary TEXT NOT NULL,
  body_md TEXT,
  sources TEXT[] NOT NULL DEFAULT '{}',
  kind TEXT NOT NULL DEFAULT 'update' CHECK (kind IN ('update','correction')),
  is_material BOOLEAN NOT NULL DEFAULT false,
  tweeted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_updates_article ON ghanacrimes.story_updates(article_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_updates_untweeted ON ghanacrimes.story_updates(posted_at) WHERE is_material AND tweeted_at IS NULL;

ALTER TABLE ghanacrimes.story_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view updates on published articles" ON ghanacrimes.story_updates;
CREATE POLICY "Anyone can view updates on published articles" ON ghanacrimes.story_updates
  FOR SELECT USING (EXISTS (SELECT 1 FROM ghanacrimes.articles a WHERE a.id = article_id AND a.is_published = true)
                    OR ghanacrimes.has_role(auth.uid(), 'admin') OR ghanacrimes.has_role(auth.uid(), 'editor'));
DROP POLICY IF EXISTS "Editors and admins can manage story updates" ON ghanacrimes.story_updates;
CREATE POLICY "Editors and admins can manage story updates" ON ghanacrimes.story_updates
  FOR ALL USING (ghanacrimes.has_role(auth.uid(), 'admin') OR ghanacrimes.has_role(auth.uid(), 'editor'))
  WITH CHECK (ghanacrimes.has_role(auth.uid(), 'admin') OR ghanacrimes.has_role(auth.uid(), 'editor'));
-- service_role bypasses RLS (bots write with the service key).

-- 2) Helper bots call: add an update / correction
CREATE OR REPLACE FUNCTION ghanacrimes.add_story_update(
  p_article_id UUID, p_summary TEXT, p_body_md TEXT DEFAULT NULL, p_sources TEXT[] DEFAULT '{}',
  p_kind TEXT DEFAULT 'update', p_is_material BOOLEAN DEFAULT false,
  p_new_title TEXT DEFAULT NULL, p_new_summary TEXT DEFAULT NULL,
  p_mirror_to_thread BOOLEAN DEFAULT false  -- also add a thread_updates row when the article has a thread (may trigger live tweet)
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ghanacrimes, public AS $$
DECLARE v_id UUID; v_old_title TEXT; v_thread UUID;
BEGIN
  SELECT title, thread_id INTO v_old_title, v_thread FROM ghanacrimes.articles WHERE id = p_article_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'article % not found', p_article_id; END IF;
  INSERT INTO ghanacrimes.story_updates(article_id, headline_change, summary, body_md, sources, kind, is_material)
  VALUES (p_article_id,
          CASE WHEN p_new_title IS NOT NULL AND p_new_title IS DISTINCT FROM v_old_title THEN p_new_title END,
          p_summary, p_body_md, COALESCE(p_sources,'{}'), p_kind, p_is_material)
  RETURNING id INTO v_id;
  -- Headline / top paragraph change in place only when supplied. slug + published_at untouched.
  PERFORM set_config('gc.story_update', '1', true);
  UPDATE ghanacrimes.articles SET
    title = COALESCE(p_new_title, title),
    summary = COALESCE(p_new_summary, summary),
    content_updated_at = now()
  WHERE id = p_article_id;
  PERFORM set_config('gc.story_update', '0', true);
  IF p_mirror_to_thread AND v_thread IS NOT NULL THEN
    INSERT INTO ghanacrimes.thread_updates(thread_id, title, body, source_article_id)
    VALUES (v_thread, left(p_summary, 200), COALESCE(p_body_md, p_summary), p_article_id);
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION ghanacrimes.add_story_update(UUID,TEXT,TEXT,TEXT[],TEXT,BOOLEAN,TEXT,TEXT,BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ghanacrimes.add_story_update(UUID,TEXT,TEXT,TEXT[],TEXT,BOOLEAN,TEXT,TEXT,BOOLEAN) TO service_role;

-- 3) Cheap matching: URL -> story_key (30d) -> >=2 key-term overlap with titles (14d).
-- Returns candidates; if match_type = 'terms' the bot asks a one-line AI yes/no before amending.
CREATE OR REPLACE FUNCTION ghanacrimes.find_story_match(
  p_source_url TEXT DEFAULT NULL, p_story_key TEXT DEFAULT NULL, p_terms TEXT[] DEFAULT '{}'
) RETURNS TABLE(article_id UUID, slug TEXT, title TEXT, published_at TIMESTAMPTZ, match_type TEXT, overlap INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ghanacrimes, public AS $$
BEGIN
  IF p_source_url IS NOT NULL THEN
    RETURN QUERY SELECT a.id, a.article_slug, a.title, a.published_at, 'url'::TEXT, NULL::INT
      FROM ghanacrimes.articles a
      WHERE a.is_published AND a.published_at > now() - interval '30 days'
        AND (a.source_url = p_source_url OR p_source_url = ANY(a.source_urls)
             OR EXISTS (SELECT 1 FROM ghanacrimes.story_updates u WHERE u.article_id = a.id AND p_source_url = ANY(u.sources)))
      ORDER BY a.published_at DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  IF p_story_key IS NOT NULL THEN
    RETURN QUERY SELECT a.id, a.article_slug, a.title, a.published_at, 'story_key'::TEXT, NULL::INT
      FROM ghanacrimes.articles a
      WHERE a.is_published AND a.story_key = p_story_key AND a.published_at > now() - interval '30 days'
      ORDER BY a.published_at DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  IF COALESCE(array_length(p_terms,1),0) >= 2 THEN
    RETURN QUERY SELECT a.id, a.article_slug, a.title, a.published_at, 'terms'::TEXT, x.n
      FROM ghanacrimes.articles a
      CROSS JOIN LATERAL (SELECT count(*)::INT AS n FROM unnest(p_terms) t
                          WHERE length(t) > 2 AND a.title ILIKE '%' || t || '%') x
      WHERE a.is_published AND a.published_at > now() - interval '14 days' AND x.n >= 2
      ORDER BY x.n DESC, a.published_at DESC LIMIT 3;
  END IF;
END $$;
REVOKE ALL ON FUNCTION ghanacrimes.find_story_match(TEXT,TEXT,TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ghanacrimes.find_story_match(TEXT,TEXT,TEXT[]) TO service_role;
GRANT SELECT ON ghanacrimes.story_updates TO anon, authenticated; GRANT ALL ON ghanacrimes.story_updates TO service_role;
COMMIT;
