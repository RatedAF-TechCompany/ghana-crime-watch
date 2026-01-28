-- Create newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (true);

-- Only service role can read/update/delete (for sending emails)
CREATE POLICY "Service role can manage subscribers"
ON public.newsletter_subscribers
FOR ALL
USING (false)
WITH CHECK (false);

-- Add index for active subscribers lookup
CREATE INDEX idx_newsletter_active ON public.newsletter_subscribers(is_active) WHERE is_active = true;