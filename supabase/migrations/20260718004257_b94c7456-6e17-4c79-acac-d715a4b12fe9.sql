
-- Track items we've already decided about (deterministic or AI) so we never re-classify them
CREATE TABLE IF NOT EXISTS public.ai_rejects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_hash TEXT,
  title_hash TEXT,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_rejects_url_hash ON public.ai_rejects(url_hash) WHERE url_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_rejects_title_hash ON public.ai_rejects(title_hash) WHERE title_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_rejects_created_at ON public.ai_rejects(created_at DESC);

GRANT SELECT ON public.ai_rejects TO authenticated;
GRANT ALL ON public.ai_rejects TO service_role;
ALTER TABLE public.ai_rejects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view ai_rejects" ON public.ai_rejects
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add cost visibility columns to newsroom_runs
ALTER TABLE public.newsroom_runs
  ADD COLUMN IF NOT EXISTS ai_calls INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discovery_ran BOOLEAN NOT NULL DEFAULT false;
