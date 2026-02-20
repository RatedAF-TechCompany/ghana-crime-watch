
-- Create a SECURITY DEFINER function that allows public users to submit fraud reports
-- This bypasses RLS on fraud_accounts (which requires admin/editor role for INSERT)
-- while still safely validating and inserting data

CREATE OR REPLACE FUNCTION public.submit_fraud_report(
  p_platform TEXT,
  p_account_name TEXT,
  p_account_handle TEXT DEFAULT NULL,
  p_account_link TEXT DEFAULT NULL,
  p_reporter_name TEXT DEFAULT NULL,
  p_reporter_email TEXT DEFAULT NULL,
  p_reporter_phone TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'GHS',
  p_incident_date DATE DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_evidence_files TEXT[] DEFAULT '{}'::TEXT[],
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_report_id UUID;
  v_ref_id TEXT;
BEGIN
  -- Validate required fields
  IF p_platform IS NULL OR p_platform = '' THEN
    RETURN jsonb_build_object('error', 'Platform is required');
  END IF;
  IF p_account_name IS NULL OR p_account_name = '' THEN
    RETURN jsonb_build_object('error', 'Account name is required');
  END IF;
  IF p_payment_method IS NULL OR p_payment_method = '' THEN
    RETURN jsonb_build_object('error', 'Payment method is required');
  END IF;
  IF p_incident_date IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident date is required');
  END IF;
  IF p_description IS NULL OR length(trim(p_description)) < 20 THEN
    RETURN jsonb_build_object('error', 'Description must be at least 20 characters');
  END IF;

  -- Check for duplicate by platform + account_name (case-insensitive)
  SELECT id INTO v_account_id
  FROM public.fraud_accounts
  WHERE platform = p_platform
    AND lower(account_name) = lower(p_account_name)
  LIMIT 1;

  -- If not found, check by account_link
  IF v_account_id IS NULL AND p_account_link IS NOT NULL AND p_account_link != '' THEN
    SELECT id INTO v_account_id
    FROM public.fraud_accounts
    WHERE account_link = p_account_link
    LIMIT 1;
  END IF;

  -- Create new account record if no duplicate found
  IF v_account_id IS NULL THEN
    INSERT INTO public.fraud_accounts (
      platform,
      account_name,
      account_handle,
      account_link,
      status
    ) VALUES (
      p_platform,
      p_account_name,
      NULLIF(p_account_handle, ''),
      NULLIF(p_account_link, ''),
      'Pending'
    )
    RETURNING id INTO v_account_id;
  END IF;

  -- Generate reference ID if not provided
  v_ref_id := COALESCE(p_reference_id, 'GCF-' || upper(substring(gen_random_uuid()::text, 1, 8)));

  -- Insert the fraud report
  INSERT INTO public.fraud_reports (
    fraud_account_id,
    reporter_name,
    reporter_email,
    reporter_phone,
    payment_method,
    amount,
    currency,
    incident_date,
    region,
    description,
    evidence_files,
    reference_id,
    is_public
  ) VALUES (
    v_account_id,
    NULLIF(p_reporter_name, ''),
    NULLIF(p_reporter_email, ''),
    NULLIF(p_reporter_phone, ''),
    p_payment_method,
    p_amount,
    COALESCE(p_currency, 'GHS'),
    p_incident_date,
    NULLIF(p_region, ''),
    p_description,
    COALESCE(p_evidence_files, '{}'::TEXT[]),
    v_ref_id,
    false
  )
  RETURNING id INTO v_report_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'report_id', v_report_id,
    'reference_id', v_ref_id
  );
END;
$$;

-- Grant execute to anon and authenticated roles so public users can call it
GRANT EXECUTE ON FUNCTION public.submit_fraud_report TO anon, authenticated;
