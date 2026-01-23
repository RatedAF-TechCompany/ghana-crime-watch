-- Create table to track crime statistics per city
CREATE TABLE public.city_crime_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL UNIQUE,
  region TEXT,
  crime_count INTEGER NOT NULL DEFAULT 0,
  last_incident_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_crime_stats ENABLE ROW LEVEL SECURITY;

-- Public read access for the dashboard
CREATE POLICY "City crime stats are viewable by everyone"
ON public.city_crime_stats FOR SELECT
USING (true);

-- Only system (via service role) can modify
CREATE POLICY "Only service role can modify city stats"
ON public.city_crime_stats FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for fast sorting
CREATE INDEX idx_city_crime_stats_count ON public.city_crime_stats(crime_count DESC);

-- Trigger for updated_at
CREATE TRIGGER update_city_crime_stats_updated_at
BEFORE UPDATE ON public.city_crime_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.city_crime_stats;

-- Seed with major Ghanaian cities
INSERT INTO public.city_crime_stats (city_name, region, crime_count) VALUES
  ('Accra', 'Greater Accra', 0),
  ('Kumasi', 'Ashanti', 0),
  ('Tema', 'Greater Accra', 0),
  ('Takoradi', 'Western', 0),
  ('Kasoa', 'Central', 0),
  ('Tamale', 'Northern', 0),
  ('Cape Coast', 'Central', 0),
  ('Koforidua', 'Eastern', 0),
  ('Sunyani', 'Bono', 0),
  ('Ho', 'Volta', 0),
  ('Bolgatanga', 'Upper East', 0),
  ('Wa', 'Upper West', 0),
  ('Techiman', 'Bono East', 0),
  ('Obuasi', 'Ashanti', 0),
  ('Teshie', 'Greater Accra', 0),
  ('Madina', 'Greater Accra', 0),
  ('Ashaiman', 'Greater Accra', 0),
  ('Nungua', 'Greater Accra', 0),
  ('Dansoman', 'Greater Accra', 0),
  ('Adum', 'Ashanti', 0),
  ('Sekondi', 'Western', 0),
  ('Winneba', 'Central', 0),
  ('Aflao', 'Volta', 0),
  ('Hohoe', 'Volta', 0),
  ('Nsawam', 'Eastern', 0),
  ('Suhum', 'Eastern', 0),
  ('Nkawkaw', 'Eastern', 0),
  ('Ejura', 'Ashanti', 0),
  ('Agona Swedru', 'Central', 0),
  ('Elmina', 'Central', 0)
ON CONFLICT (city_name) DO NOTHING;