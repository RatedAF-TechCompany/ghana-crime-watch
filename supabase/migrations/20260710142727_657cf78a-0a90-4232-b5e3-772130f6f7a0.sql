
-- posted_articles
CREATE TABLE public.posted_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_url text NOT NULL UNIQUE,
  article_title text NOT NULL,
  post_text text NOT NULL,
  posted_to_x boolean NOT NULL DEFAULT false,
  x_post_id text,
  status text NOT NULL DEFAULT 'preview',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz
);

GRANT SELECT ON public.posted_articles TO authenticated;
GRANT ALL ON public.posted_articles TO service_role;

ALTER TABLE public.posted_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view posted_articles"
  ON public.posted_articles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- run_logs
CREATE TABLE public.run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  selected_article_url text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.run_logs TO authenticated;
GRANT ALL ON public.run_logs TO service_role;

ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view run_logs"
  ON public.run_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_run_logs_run_time ON public.run_logs (run_time DESC);
CREATE INDEX idx_posted_articles_created ON public.posted_articles (created_at DESC);

-- auto-post toggle in existing site_settings
INSERT INTO public.site_settings (key, value, label)
VALUES ('auto_post_enabled', 'true', 'GhanaCrimes AutoPost enabled')
ON CONFLICT (key) DO NOTHING;
