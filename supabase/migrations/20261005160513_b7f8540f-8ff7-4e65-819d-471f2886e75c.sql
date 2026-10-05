-- lovable-cron-fallback-reviewed: external news feeds offer no push/webhook; user explicitly requires 10-minute polling
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0;

UPDATE public.sources SET feed_url = rss_url WHERE (feed_url IS NULL OR feed_url = '') AND rss_url IS NOT NULL AND rss_url <> '';

UPDATE public.sources SET api_url='https://www.citinewsroom.com/wp-json/wp/v2/posts?per_page=30', feed_url=NULL, rss_url=NULL, requires_topic_gate=true, active=true WHERE name='Citi Newsroom';
UPDATE public.sources SET feed_url='https://rss.modernghana.com/news.xml', active=true, requires_topic_gate=true WHERE name='Modern Ghana';
UPDATE public.sources SET feed_url='https://www.pulse.com.gh/rss-articles.xml', active=true, requires_topic_gate=true WHERE name='Pulse Ghana';
UPDATE public.sources SET feed_url='https://www.graphic.com.gh/news/general-news.html?format=feed&type=rss' WHERE name='Graphic Online';
UPDATE public.sources SET feed_url=rss_url WHERE name IN ('Daily Guide Network','Atinka Online') AND rss_url IS NOT NULL;
UPDATE public.sources SET feed_url='https://www.gbcghanaonline.com/feed/', requires_topic_gate=true WHERE name='GBC Ghana Online';

INSERT INTO public.sources (name, domain, type, feed_url, requires_topic_gate, active, trust_tier, poll_minutes)
SELECT v.* FROM (VALUES
 ('GBC Crime','gbcghanaonline.com','media','https://www.gbcghanaonline.com/category/news/crime/feed/',false,true,2,10),
 ('MyJoy News','myjoyonline.com','media','https://www.myjoyonline.com/news/feed/',true,true,2,10),
 ('The Ghana Report','theghanareport.com','media','https://theghanareport.com/feed/',true,true,2,10),
 ('Kessben Online','kessbenonline.com','media','https://kessbenonline.com/feed/',true,true,2,10),
 ('Rainbow Radio','rainbowradioonline.com','media','https://rainbowradioonline.com/feed/',true,true,2,10),
 ('Ghana Business News','ghanabusinessnews.com','media','https://www.ghanabusinessnews.com/feed/',true,true,2,10),
 ('Yen Ghana','yen.com.gh','media','https://yen.com.gh/rss/all.rss',true,true,2,10)
) AS v(name,domain,type,feed_url,requires_topic_gate,active,trust_tier,poll_minutes)
WHERE NOT EXISTS (SELECT 1 FROM public.sources s WHERE s.feed_url = v.feed_url OR s.name = v.name);

UPDATE public.sources SET active=false, last_status='inactive: blocked or bot-checked from collection servers'
WHERE name IN ('GhanaWeb Crime','GhanaWeb News','News Ghana','Asaase Radio','The Chronicle Ghana','Ghanaian Times','Starr FM','UTV Ghana','Metro TV Ghana','Peace FM Online','Ghana Immigration Service','EOCO','Ghana Prisons Service','Ghana News Agency','Cyber Security Authority');

UPDATE public.sources SET poll_minutes=240 WHERE name IN ('Judicial Service of Ghana','NACOC','CHRAJ');
UPDATE public.sources SET poll_minutes=10 WHERE type='media';

DO $$ BEGIN
  PERFORM cron.unschedule('source-ingest-every-10min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='source-ingest-every-10min');
  PERFORM cron.unschedule('newsletter-digest-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='newsletter-digest-daily');
END $$;

SELECT cron.schedule('source-ingest-every-10min','*/10 * * * *', $$
  select net.http_post(url := 'https://zninjnjujptjxdikehun.supabase.co/functions/v1/source-ingest',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='ingest_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 150000);
$$);

SELECT cron.schedule('newsletter-digest-daily','0 6 * * *', $$
  select net.http_post(url := 'https://zninjnjujptjxdikehun.supabase.co/functions/v1/send-newsletter-digest',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='ingest_cron_secret')),
    body := '{}'::jsonb);
$$);