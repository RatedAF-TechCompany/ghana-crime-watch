
-- Contact messages
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 255),
  subject text CHECK (length(subject) <= 200),
  message text NOT NULL CHECK (length(message) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');
CREATE POLICY "Admins and editors can read contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Tips
CREATE TABLE public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_text text NOT NULL CHECK (length(tip_text) BETWEEN 20 AND 10000),
  location text CHECK (length(location) <= 200),
  contact text CHECK (length(contact) <= 255),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.tips TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.tips TO authenticated;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a tip" ON public.tips FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');
CREATE POLICY "Admins and editors can read tips" ON public.tips FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Admins can update tips" ON public.tips FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete tips" ON public.tips FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Correction requests
CREATE TABLE public.correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_url text CHECK (length(article_url) <= 500),
  name text CHECK (length(name) <= 120),
  email text CHECK (length(email) <= 255),
  details text NOT NULL CHECK (length(details) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.correction_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.correction_requests TO authenticated;
GRANT ALL ON public.correction_requests TO service_role;
ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a correction" ON public.correction_requests FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');
CREATE POLICY "Admins and editors can read correction requests" ON public.correction_requests FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "Admins can update correction requests" ON public.correction_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete correction requests" ON public.correction_requests FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Comments: no direct anonymous reads. Public display goes through a safe function (no emails).
DROP POLICY IF EXISTS "Approved comments are viewable by everyone" ON public.comments;
CREATE POLICY "Staff can view comments" ON public.comments FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor'));
REVOKE SELECT ON public.comments FROM anon;

CREATE OR REPLACE FUNCTION public.get_approved_comments(_article_id uuid)
RETURNS TABLE (id uuid, article_id uuid, parent_id uuid, commenter_name text, comment_text text, created_at timestamptz, is_verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.article_id, c.parent_id, c.commenter_name, c.comment_text, c.created_at, c.is_verified
  FROM public.comments c
  JOIN public.articles a ON a.id = c.article_id AND a.is_published
  WHERE c.article_id = _article_id AND c.is_approved
  ORDER BY c.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.get_approved_comments(uuid) TO anon, authenticated;

-- Bookmarks / user_roles: scope to signed-in users only
REVOKE ALL ON public.bookmarks FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- View counter callable by visitors (articles are not anonymously updatable)
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;
