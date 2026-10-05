ALTER TABLE public.sources DROP CONSTRAINT sources_type_check;
ALTER TABLE public.sources ADD CONSTRAINT sources_type_check CHECK (type = ANY (ARRAY['official'::text, 'media'::text, 'discovery'::text]));
INSERT INTO public.sources (name, domain, feed_url, type, trust_tier, active, requires_topic_gate, poll_minutes, last_status)
VALUES
 ('The High Street Journal', 'thehighstreetjournal.com', 'https://thehighstreetjournal.com/feed/', 'media', 3, true, true, 10, NULL),
 ('Chale News', 'chale.news', 'https://chale.news/rss/', 'media', 3, true, true, 10, NULL),
 ('Google News Ghana (discovery)', 'news.google.com', 'https://news.google.com/rss/search?q=Ghana+(crime+OR+arrest+OR+court+OR+police+OR+remanded+OR+charged)&hl=en-GH&gl=GH&ceid=GH:en', 'discovery', 3, false, true, 30, 'inactive: news.google.com robots.txt disallows /rss for all crawlers; not fetched');