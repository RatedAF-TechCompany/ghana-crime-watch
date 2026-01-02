-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_comments;

CREATE VIEW public.public_comments 
WITH (security_invoker = true)
AS
SELECT 
  id,
  article_id,
  parent_id,
  commenter_name,
  comment_text,
  created_at,
  updated_at,
  is_approved,
  is_verified
FROM public.comments
WHERE is_approved = true;