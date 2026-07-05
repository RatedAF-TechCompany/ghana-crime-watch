ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS source_url TEXT;

UPDATE public.articles AS a
SET source_url = na.source_url
FROM public.newsroom_articles AS na
WHERE na.generated_article_id = a.id
  AND a.source_url IS NULL
  AND na.source_url IS NOT NULL;