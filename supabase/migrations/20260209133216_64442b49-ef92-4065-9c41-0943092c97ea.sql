
-- Create site_settings table for ad toggles and other config
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for frontend ad checks)
CREATE POLICY "Settings are viewable by everyone"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Only admins can update settings"
ON public.site_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert settings"
ON public.site_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete settings"
ON public.site_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial ad settings (all OFF as requested)
INSERT INTO public.site_settings (key, value, label) VALUES
  ('ad_calabashe', 'false'::jsonb, 'Calabashe Ad Banner'),
  ('ad_whatsapp_cta', 'false'::jsonb, 'WhatsApp Channel CTA');
