# Developing-story updates

1. **Match** (cheapest first) via `find_story_match(source_url, story_key, terms)`:
   same source URL (article or any update source, 30d) → same `story_key` (30d) → ≥2 named-term overlap with titles (14d).
   Only for a `terms` match ask a one-line AI yes/no. Story key = `entity|event|place|YYYY-MM` (lowercase, hyphenated).
2. **Amend** via `add_story_update(...)`: inserts a `story_updates` row; pass `new_title` / `new_summary` ONLY when the new fact
   changes the headline / top paragraph. Slug and `published_at` never change. `content_updated_at` is set.
3. **Page**: "Published <date time> UK · Updated HH:MM GMT", newest-first "Updated 14:05 UK: …" box with sources; corrections shown separately as "Correction:".
4. **SEO**: existing content_updated_at (already drives sitemap lastmod / dateModified) is bumped by add_story_update even when only an update row is added. Optional `mirror_to_thread` also posts to the linked story_thread live timeline.
5. **Tweets**: bot sets `is_material`; GhanaCrimes X replies to the original tweet with "UPDATE: …" with the same URL, then `tweeted <id>`.
6. Legal: updates always publish; never identify a minor; keep "alleged" until conviction.

Helper: `scripts/story-update.mjs` (match | add | pending | tweeted).
