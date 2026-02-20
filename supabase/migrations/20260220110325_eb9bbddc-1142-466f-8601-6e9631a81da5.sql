
-- Create FraudAccount table
CREATE TABLE public.fraud_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  account_name text NOT NULL,
  account_handle text,
  account_link text,
  status text NOT NULL DEFAULT 'Pending',
  moderator_note text,
  views_count integer NOT NULL DEFAULT 0,
  reports_count integer NOT NULL DEFAULT 0,
  total_reported_loss numeric NOT NULL DEFAULT 0,
  last_reported_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fraud_accounts_status_check CHECK (status IN ('Pending', 'VerifiedScam', 'Cleared', 'Disputed'))
);

-- Create FraudReport table
CREATE TABLE public.fraud_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fraud_account_id uuid NOT NULL REFERENCES public.fraud_accounts(id) ON DELETE CASCADE,
  reporter_name text,
  reporter_email text,
  reporter_phone text,
  payment_method text NOT NULL,
  amount numeric,
  currency text DEFAULT 'GHS',
  incident_date date NOT NULL,
  region text,
  description text NOT NULL,
  evidence_files text[] DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  ip_address text,
  reference_id text NOT NULL DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create AdminNote table
CREATE TABLE public.fraud_admin_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fraud_account_id uuid NOT NULL REFERENCES public.fraud_accounts(id) ON DELETE CASCADE,
  note text NOT NULL,
  admin_user_id uuid,
  admin_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create search_analytics table for tracking
CREATE TABLE public.fraud_search_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fraud_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_search_analytics ENABLE ROW LEVEL SECURITY;

-- fraud_accounts: public can view VerifiedScam, Cleared, Disputed; Pending only if admin/editor
CREATE POLICY "Public can view approved fraud accounts"
  ON public.fraud_accounts FOR SELECT
  USING (status != 'Pending' OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can insert fraud accounts"
  ON public.fraud_accounts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update fraud accounts"
  ON public.fraud_accounts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete fraud accounts"
  ON public.fraud_accounts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- fraud_reports: anyone can insert; only admins/editors can view reporter contact info; public see their own via reference
CREATE POLICY "Anyone can submit fraud reports"
  ON public.fraud_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and editors can view all fraud reports"
  ON public.fraud_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR is_public = true);

CREATE POLICY "Admins and editors can update fraud reports"
  ON public.fraud_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete fraud reports"
  ON public.fraud_reports FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- fraud_admin_notes: only admins/editors
CREATE POLICY "Admins and editors can view admin notes"
  ON public.fraud_admin_notes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can insert admin notes"
  ON public.fraud_admin_notes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete admin notes"
  ON public.fraud_admin_notes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- fraud_search_analytics: anyone can insert, only admins view
CREATE POLICY "Anyone can log searches"
  ON public.fraud_search_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view search analytics"
  ON public.fraud_search_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for fast search
CREATE INDEX idx_fraud_accounts_platform ON public.fraud_accounts(platform);
CREATE INDEX idx_fraud_accounts_account_name ON public.fraud_accounts USING gin(to_tsvector('english', account_name));
CREATE INDEX idx_fraud_accounts_status ON public.fraud_accounts(status);
CREATE INDEX idx_fraud_accounts_handle ON public.fraud_accounts(account_handle);
CREATE INDEX idx_fraud_reports_fraud_account_id ON public.fraud_reports(fraud_account_id);
CREATE INDEX idx_fraud_reports_created_at ON public.fraud_reports(created_at DESC);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_fraud_account_views(account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fraud_accounts
  SET views_count = views_count + 1
  WHERE id = account_id;
END;
$$;

-- Function to update fraud account cached stats
CREATE OR REPLACE FUNCTION public.update_fraud_account_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.fraud_accounts
    SET
      reports_count = (SELECT COUNT(*) FROM public.fraud_reports WHERE fraud_account_id = NEW.fraud_account_id),
      total_reported_loss = (SELECT COALESCE(SUM(CASE WHEN currency = 'GHS' THEN amount ELSE amount * 15 END), 0) FROM public.fraud_reports WHERE fraud_account_id = NEW.fraud_account_id AND amount IS NOT NULL),
      last_reported_at = now(),
      updated_at = now()
    WHERE id = NEW.fraud_account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.fraud_accounts
    SET
      reports_count = (SELECT COUNT(*) FROM public.fraud_reports WHERE fraud_account_id = OLD.fraud_account_id),
      total_reported_loss = (SELECT COALESCE(SUM(CASE WHEN currency = 'GHS' THEN amount ELSE amount * 15 END), 0) FROM public.fraud_reports WHERE fraud_account_id = OLD.fraud_account_id AND amount IS NOT NULL),
      updated_at = now()
    WHERE id = OLD.fraud_account_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_fraud_account_stats
  AFTER INSERT OR DELETE ON public.fraud_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fraud_account_stats();

-- Updated_at trigger for fraud_accounts
CREATE OR REPLACE FUNCTION public.update_fraud_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_fraud_accounts_updated_at
  BEFORE UPDATE ON public.fraud_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fraud_accounts_updated_at();
