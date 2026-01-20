-- Create function to increment article view count
CREATE OR REPLACE FUNCTION public.increment_view_count(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO authenticated;