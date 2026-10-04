-- Sources: extend
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'media' CHECK (type IN ('official','media')),
  ADD COLUMN IF NOT EXISTS feed_url text,
  ADD COLUMN IF NOT EXISTS api_url text,
  ADD COLUMN IF NOT EXISTS html_url text,
  ADD COLUMN IF NOT EXISTS trust_tier int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS poll_minutes int NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS last_polled_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status text;

UPDATE public.sources SET feed_url='https://www.myjoyonline.com/news/crime/feed/', html_url='https://www.myjoyonline.com', trust_tier=2 WHERE name='MyJoyOnline';
UPDATE public.sources SET feed_url='https://www.citinewsroom.com/feed/', html_url='https://www.citinewsroom.com', trust_tier=2 WHERE name='Citi Newsroom';
UPDATE public.sources SET feed_url='https://www.graphic.com.gh/news/general-news.html?format=feed&type=rss', html_url='https://www.graphic.com.gh', trust_tier=2 WHERE name='Graphic Online';
UPDATE public.sources SET feed_url='https://www.adomonline.com/category/news/crime/feed/', html_url='https://www.adomonline.com', trust_tier=2 WHERE name='Adom Online';
UPDATE public.sources SET feed_url='https://www.3news.com/feed.xml', html_url='https://www.3news.com', trust_tier=2 WHERE name='3News';

INSERT INTO public.sources (name, domain, type, feed_url, api_url, html_url, trust_tier, active, requires_topic_gate) VALUES
 ('Ghana News Agency','gna.org.gh','media',NULL,'https://gna.org.gh/wp-json/wp/v2/posts?search=police','https://gna.org.gh',2,true,true),
 ('NACOC','ncc.gov.gh','official','https://www.ncc.gov.gh/feed/',NULL,'https://www.ncc.gov.gh',1,true,false),
 ('Ghana Immigration Service','gis.gov.gh','official','https://gis.gov.gh/feed/',NULL,'https://gis.gov.gh',1,true,false),
 ('EOCO','eoco.gov.gh','official','https://www.eoco.gov.gh/index.php/news?format=feed&type=rss',NULL,'https://www.eoco.gov.gh',1,true,false),
 ('Judicial Service of Ghana','judicial.gov.gh','official','https://www.judicial.gov.gh/index.php/publications/news-publications/js-latest-news?format=feed&type=rss',NULL,'https://www.judicial.gov.gh',1,true,false),
 ('Ghana Prisons Service','ghanaprisons.gov.gh','official','https://ghanaprisons.gov.gh/feed/',NULL,'https://ghanaprisons.gov.gh',1,true,false),
 ('CHRAJ','chraj.gov.gh','official','https://chraj.gov.gh/feed/',NULL,'https://chraj.gov.gh',1,true,false);

-- Raw items (headline + short summary + link only)
CREATE TABLE public.raw_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  url text NOT NULL,
  url_hash text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','rejected','review','published','duplicate','thread_update','error')),
  reason text,
  gate_report jsonb,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  thread_id uuid REFERENCES public.story_threads(id) ON DELETE SET NULL,
  attempts int NOT NULL DEFAULT 0
);
CREATE INDEX raw_items_fetched_idx ON public.raw_items (fetched_at DESC);
CREATE INDEX raw_items_status_idx ON public.raw_items (status);
CREATE INDEX raw_items_title_trgm ON public.raw_items USING gin (title gin_trgm_ops);
GRANT SELECT, UPDATE ON public.raw_items TO authenticated;
GRANT ALL ON public.raw_items TO service_role;
ALTER TABLE public.raw_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read raw items" ON public.raw_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Staff update raw items" ON public.raw_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));

-- Corrections (published notices)
CREATE TABLE public.corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.corrections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corrections TO authenticated;
GRANT ALL ON public.corrections TO service_role;
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read corrections on published articles" ON public.corrections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.is_published));
CREATE POLICY "Staff read all corrections" ON public.corrections FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Staff write corrections" ON public.corrections FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Admins manage corrections" ON public.corrections FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete corrections" ON public.corrections FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- Pipeline runs (single-flight lock + first-run stats)
CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'ingest',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
GRANT SELECT ON public.pipeline_runs TO authenticated;
GRANT ALL ON public.pipeline_runs TO service_role;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read pipeline runs" ON public.pipeline_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));

-- Articles: editorial workflow fields
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS source_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gate_report jsonb,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS offence_type text,
  ADD COLUMN IF NOT EXISTS case_status text;
UPDATE public.articles SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;
UPDATE public.articles SET source_urls = ARRAY[source_url] WHERE source_url IS NOT NULL AND source_url <> '';
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check CHECK (status IN ('draft','review','approved','published','rejected'));

CREATE OR REPLACE FUNCTION public.sync_article_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'draft' AND NEW.is_published THEN NEW.status := 'published'; END IF;
    NEW.is_published := (NEW.status = 'published');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_published := (NEW.status = 'published');
  ELSIF NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    NEW.status := CASE WHEN NEW.is_published THEN 'published' ELSE 'draft' END;
  END IF;
  IF NEW.is_published AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER articles_sync_status BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.sync_article_status();

-- Similar recent article lookup for dedup / threading
CREATE OR REPLACE FUNCTION public.find_similar_articles(_title text, _hours int DEFAULT 72)
RETURNS TABLE(id uuid, thread_id uuid, published_at timestamptz, created_at timestamptz, sim real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.thread_id, a.published_at, a.created_at, similarity(a.title, _title)
  FROM public.articles a
  WHERE a.created_at > now() - make_interval(hours => _hours) AND similarity(a.title, _title) > 0.35
  ORDER BY 5 DESC LIMIT 5
$$;
CREATE OR REPLACE FUNCTION public.find_similar_raw_items(_title text, _exclude uuid, _hours int DEFAULT 48)
RETURNS TABLE(id uuid, source_id uuid, sim real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.source_id, similarity(r.title, _title)
  FROM public.raw_items r
  WHERE r.id <> _exclude AND r.fetched_at > now() - make_interval(hours => _hours) AND similarity(r.title, _title) > 0.45
  ORDER BY 3 DESC LIMIT 10
$$;
REVOKE EXECUTE ON FUNCTION public.find_similar_articles(text,int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_similar_raw_items(text,uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_articles(text,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_similar_raw_items(text,uuid,int) TO service_role;

-- Settings
INSERT INTO public.site_settings (key, value, label) VALUES
 ('auto_publish_enabled', 'true'::jsonb, 'Auto-publish gate-passed stories'),
 ('auto_publish_daily_cap', '20'::jsonb, 'Max auto-published stories per day'),
 ('ingest_paused', 'false'::jsonb, 'Ingestion paused (AI credits)')
ON CONFLICT (key) DO NOTHING;

-- Cron secret held in vault; checked by the pipeline via service-role RPC
SELECT vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'ingest_cron_secret', 'Header secret for source-ingest cron');
CREATE OR REPLACE FUNCTION public.verify_cron_secret(_secret text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='ingest_cron_secret' AND decrypted_secret = _secret)
$$;
REVOKE EXECUTE ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;