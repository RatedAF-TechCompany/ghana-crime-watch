CREATE TABLE public.official_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('wanted','missing')),
  person_name text NOT NULL CHECK (char_length(person_name) BETWEEN 2 AND 150),
  details text CHECK (char_length(details) <= 1000),
  agency text NOT NULL CHECK (agency IN ('Ghana Police Service','INTERPOL')),
  official_url text NOT NULL CHECK (official_url ~* '^https://([a-z0-9-]+\.)*(police\.gov\.gh|interpol\.int)(/|$)'),
  photo_url text CHECK (photo_url IS NULL OR photo_url ~* '^https://([a-z0-9-]+\.)*(police\.gov\.gh|interpol\.int)(/|$)'),
  date_seen date NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.official_notices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_notices TO authenticated;
GRANT ALL ON public.official_notices TO service_role;
ALTER TABLE public.official_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published notices" ON public.official_notices FOR SELECT USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert notices" ON public.official_notices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update notices" ON public.official_notices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete notices" ON public.official_notices FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER official_notices_updated BEFORE UPDATE ON public.official_notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();