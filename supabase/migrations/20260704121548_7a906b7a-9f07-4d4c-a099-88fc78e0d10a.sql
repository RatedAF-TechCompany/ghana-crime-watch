
UPDATE public.articles
SET hero_image = NULL
WHERE hero_image IS NOT NULL
  AND split_part(hero_image, '/article-images/', 2) IN (
    SELECT name FROM storage.objects
    WHERE bucket_id = 'article-images'
      AND (metadata->>'size')::bigint = 14858
  );
