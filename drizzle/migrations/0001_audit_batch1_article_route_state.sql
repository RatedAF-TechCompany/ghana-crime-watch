ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS redirect_to text;
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_redirect_to_path;
ALTER TABLE public.articles ADD CONSTRAINT articles_redirect_to_path CHECK (redirect_to IS NULL OR redirect_to ~ '^/[a-z0-9-]+/[a-z0-9-]+$');
CREATE INDEX IF NOT EXISTS idx_articles_cat_slug ON public.articles (category_slug, article_slug);

CREATE OR REPLACE FUNCTION public.article_route_state(_category text, _slug text)
RETURNS TABLE(state text, target text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; was_live boolean; path text; hops int := 0;
BEGIN
  SELECT a.is_published, a.published_at, a.redirect_to INTO r FROM public.articles a
   WHERE a.category_slug = _category AND a.article_slug = _slug ORDER BY a.is_published DESC LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unknown'::text, NULL::text; RETURN; END IF;
  IF r.is_published THEN RETURN QUERY SELECT 'published'::text, NULL::text; RETURN; END IF;
  was_live := r.published_at IS NOT NULL;
  path := r.redirect_to;
  WHILE path IS NOT NULL AND hops < 5 LOOP
    hops := hops + 1;
    SELECT a.is_published, a.redirect_to, a.category_slug, a.article_slug INTO r FROM public.articles a
     WHERE a.article_slug = split_part(path, '/', 3)
     ORDER BY (a.category_slug = split_part(path, '/', 2)) DESC, a.is_published DESC LIMIT 1;
    IF NOT FOUND THEN EXIT; END IF;
    IF r.is_published THEN RETURN QUERY SELECT 'redirect'::text, '/' || r.category_slug || '/' || r.article_slug; RETURN; END IF;
    path := r.redirect_to;
  END LOOP;
  RETURN QUERY SELECT CASE WHEN was_live THEN 'gone' ELSE 'unknown' END, NULL::text;
END $$;
REVOKE ALL ON FUNCTION public.article_route_state(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.article_route_state(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.block_junk_publish()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_published AND (TG_OP = 'INSERT' OR NOT OLD.is_published OR NEW.article_slug IS DISTINCT FROM OLD.article_slug
      OR NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body) THEN
    IF NEW.article_slug ~ '^non-ghana-skip'
       OR NEW.title ~* '^\s*(non[- ]ghana[- ]skip|skip|reject(ed)?|untitled|test)\s*$'
       OR length(btrim(regexp_replace(coalesce(NEW.body, ''), '<[^>]*>', '', 'g'))) < 200 THEN
      RAISE EXCEPTION 'blocked: placeholder or empty article cannot be published (slug %)', NEW.article_slug USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS articles_zz_block_junk_publish ON public.articles;
CREATE TRIGGER articles_zz_block_junk_publish BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.block_junk_publish();