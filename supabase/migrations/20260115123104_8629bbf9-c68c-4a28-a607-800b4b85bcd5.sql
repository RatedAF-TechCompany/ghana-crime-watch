-- Disable the scheduled newsroom automation
SELECT cron.unschedule('newsroom-hourly-scan');