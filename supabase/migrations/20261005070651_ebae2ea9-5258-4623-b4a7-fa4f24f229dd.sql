DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile, staff view all" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'));
REVOKE SELECT ON public.profiles FROM anon;

-- Hide reporter contact details on public fraud reports from visitors and non-staff
REVOKE SELECT ON public.fraud_reports FROM anon;
GRANT SELECT (id, fraud_account_id, payment_method, amount, currency, incident_date, region, description, evidence_files, is_public, reference_id, created_at, updated_at) ON public.fraud_reports TO anon;