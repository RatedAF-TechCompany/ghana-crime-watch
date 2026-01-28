-- Enable realtime for articles table to support push notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;