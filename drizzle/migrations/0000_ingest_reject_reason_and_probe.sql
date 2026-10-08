ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS reject_reason text;
INSERT INTO public.site_settings (key, value, label) VALUES
 ('ingest_paused_reason', '""'::jsonb, 'Why ingest was paused (ai_402 = automatic)'),
 ('ingest_last_probe', '""'::jsonb, 'Last AI recovery probe time')
ON CONFLICT DO NOTHING;