-- Add parent_id column for threaded replies
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Make email optional for anonymous commenting
ALTER TABLE public.comments 
ALTER COLUMN commenter_email DROP NOT NULL;

-- Update RLS policies for public commenting
DROP POLICY IF EXISTS "Verified users can create comments" ON public.comments;

CREATE POLICY "Anyone can create comments"
ON public.comments
FOR INSERT
WITH CHECK (true);

-- Allow public read of approved comments
DROP POLICY IF EXISTS "Approved comments are viewable by everyone" ON public.comments;

CREATE POLICY "Approved comments are viewable by everyone"
ON public.comments
FOR SELECT
USING (is_approved = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Update the public_comments view to include parent_id
DROP VIEW IF EXISTS public.public_comments;

CREATE VIEW public.public_comments AS
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