
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx ON public.articles USING gin (title gin_trgm_ops);

CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  domain text NOT NULL,
  rss_url text,
  requires_topic_gate boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read sources" ON public.sources FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Admins manage sources" ON public.sources FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER sources_updated_at BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sources (name, domain, rss_url, requires_topic_gate) VALUES
  ('GhanaWeb Crime','ghanaweb.com','https://www.ghanaweb.com/GhanaHomePage/crime/rss.xml',false),
  ('GhanaWeb News','ghanaweb.com','https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml',true),
  ('Citi Newsroom','citinewsroom.com','https://citinewsroom.com/category/general/crime/feed/',false),
  ('MyJoyOnline','myjoyonline.com','https://www.myjoyonline.com/category/news/crime/feed/',false),
  ('Graphic Online','graphic.com.gh','https://www.graphic.com.gh/feed',true),
  ('3News','3news.com','https://3news.com/feed/',true),
  ('UTV Ghana','utvghana.com',NULL,true),
  ('Metro TV Ghana','metrotvonline.com',NULL,true),
  ('Peace FM Online','peacefmonline.com','https://www.peacefmonline.com/pages/local/crime/rss.xml',false),
  ('Adom Online','adomonline.com','https://www.adomonline.com/feed/',true),
  ('Starr FM','starrfm.com.gh','https://starrfm.com.gh/feed/',true),
  ('Pulse Ghana','pulse.com.gh','https://www.pulse.com.gh/rss',true),
  ('Modern Ghana','modernghana.com','https://www.modernghana.com/rss/',true),
  ('News Ghana','newsghana.com.gh','https://newsghana.com.gh/feed/',true),
  ('The Chronicle Ghana','thechronicle.com.gh','https://thechronicle.com.gh/feed/',true),
  ('Daily Guide Network','dailyguidenetwork.com','https://dailyguidenetwork.com/feed/',true),
  ('The Finder Online','thefinderonline.com',NULL,true),
  ('Ghanaian Times','ghanaiantimes.com.gh','https://www.ghanaiantimes.com.gh/feed/',true),
  ('GBC Ghana Online','gbcghanaonline.com','https://www.gbcghanaonline.com/feed/',true),
  ('Asaase Radio','asaaseradio.com','https://asaaseradio.com/feed/',true),
  ('Atinka Online','atinkaonline.com','https://atinkaonline.com/feed/',true);

CREATE TABLE public.rejected_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  original_headline text NOT NULL,
  original_url text,
  reason text NOT NULL,
  confidence int,
  detail text,
  rejected_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rejected_items TO authenticated;
GRANT ALL ON public.rejected_items TO service_role;
ALTER TABLE public.rejected_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read rejected_items" ON public.rejected_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE INDEX IF NOT EXISTS rejected_items_rejected_at_idx ON public.rejected_items(rejected_at DESC);
CREATE INDEX IF NOT EXISTS rejected_items_reason_idx ON public.rejected_items(reason);
