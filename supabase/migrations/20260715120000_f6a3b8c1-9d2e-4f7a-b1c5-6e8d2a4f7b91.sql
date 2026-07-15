-- Distinguishes threads a human deliberately created from ones the
-- newsroom pipeline auto-created off a repeat-duplicate signal. Used to
-- gate auto-promotion to is_live so a human's own in-progress draft is
-- never auto-promoted out from under them, and lets the admin UI flag
-- auto-created drafts that still need a human glance.
ALTER TABLE public.story_threads
  ADD COLUMN created_by TEXT NOT NULL DEFAULT 'manual'
  CHECK (created_by IN ('manual', 'auto_pipeline'));
