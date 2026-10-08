ALTER TABLE public.raw_items DROP CONSTRAINT IF EXISTS raw_items_status_check;
ALTER TABLE public.raw_items ADD CONSTRAINT raw_items_status_check CHECK (status = ANY (ARRAY['new','rejected','review','published','duplicate','thread_update','error','merged','discovery']));
INSERT INTO public.site_settings(key,value,label) VALUES ('autopost_daily_cap','16'::jsonb,'Max X posts per UTC day') ON CONFLICT (key) DO NOTHING;
