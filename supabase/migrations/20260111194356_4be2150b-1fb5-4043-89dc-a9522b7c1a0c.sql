-- Create newsroom_runs table to track each scan session
CREATE TABLE public.newsroom_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'no_news')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  articles_found INTEGER NOT NULL DEFAULT 0,
  articles_created INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create newsroom_articles table to track each processed news item
CREATE TABLE public.newsroom_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.newsroom_runs(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  original_headline TEXT NOT NULL,
  original_summary TEXT NOT NULL,
  source_url TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'duplicate')),
  image_style TEXT,
  generated_article_id UUID REFERENCES public.articles(id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.newsroom_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsroom_articles ENABLE ROW LEVEL SECURITY;

-- RLS policies for newsroom_runs
CREATE POLICY "Admins and editors can view all newsroom runs"
  ON public.newsroom_runs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can create newsroom runs"
  ON public.newsroom_runs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update newsroom runs"
  ON public.newsroom_runs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete newsroom runs"
  ON public.newsroom_runs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for newsroom_articles
CREATE POLICY "Admins and editors can view all newsroom articles"
  ON public.newsroom_articles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can create newsroom articles"
  ON public.newsroom_articles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update newsroom articles"
  ON public.newsroom_articles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete newsroom articles"
  ON public.newsroom_articles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_newsroom_runs_status ON public.newsroom_runs(status);
CREATE INDEX idx_newsroom_runs_started_at ON public.newsroom_runs(started_at DESC);
CREATE INDEX idx_newsroom_articles_run_id ON public.newsroom_articles(run_id);
CREATE INDEX idx_newsroom_articles_processing_status ON public.newsroom_articles(processing_status);