-- 1. Create a public view for comments that excludes email addresses
CREATE VIEW public.public_comments AS 
SELECT 
  id, 
  article_id, 
  commenter_name, 
  comment_text, 
  created_at, 
  updated_at,
  is_approved,
  is_verified
FROM public.comments 
WHERE is_approved = true;

-- Grant access to the view
GRANT SELECT ON public.public_comments TO anon, authenticated;

-- 2. Fix audit logs INSERT policy - restrict to service role only
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;

-- Create a SECURITY DEFINER function to insert audit logs safely
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.audit_logs (action, resource_type, resource_id, details, user_id)
  VALUES (_action, _resource_type, _resource_id, _details, auth.uid())
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;