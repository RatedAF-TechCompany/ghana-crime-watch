-- Create crime type stats table
CREATE TABLE public.crime_type_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crime_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  crime_count INTEGER NOT NULL DEFAULT 0,
  last_incident_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crime_type_stats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Crime type stats are viewable by everyone"
ON public.crime_type_stats
FOR SELECT
USING (true);

-- Only service role can modify
CREATE POLICY "Only service role can modify crime type stats"
ON public.crime_type_stats
FOR ALL
USING (false)
WITH CHECK (false);

-- Seed initial crime types based on category taxonomy
INSERT INTO public.crime_type_stats (crime_type, display_name) VALUES
  ('violent-crime', 'Violent Crime'),
  ('theft-robbery', 'Theft & Robbery'),
  ('fraud-scams', 'Fraud & Scams'),
  ('cybercrime', 'Cybercrime'),
  ('drug-offences', 'Drug Offences'),
  ('corruption', 'Corruption'),
  ('property-crime', 'Property Crime'),
  ('organised-crime', 'Organised Crime'),
  ('sexual-offences', 'Sexual Offences'),
  ('environmental-crime', 'Environmental Crime');