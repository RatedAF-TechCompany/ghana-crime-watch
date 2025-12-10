-- Drop the SECURITY DEFINER view and recreate as INVOKER (default)
DROP VIEW IF EXISTS public.public_comments;

CREATE VIEW public.public_comments 
WITH (security_invoker = true)
AS 
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