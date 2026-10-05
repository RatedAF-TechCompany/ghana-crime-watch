# GhanaCrimes follow-up quality pass

## Public experience
- Make the compact menu apply at 1024px and below, remove tablet-width overflow, and keep Admin hidden unless the signed-in user has the admin role.
- Keep unsupported Magazine, Podcasts, Cartoon, Columns, and TV sections hidden.
- Replace blank image areas with a safely stored source image when available, otherwise a category-coloured headline card.

## Editorial quality
- Require a valid clickable source for newly processed stories.
- Add deterministic checks for headline-to-lead consistency, filler phrases, Ghana relevance, crime relevance, and category exclusions.
- Preserve all privacy and graphic-content hard blocks, the 20-per-day publishing cap, and presumption-of-innocence wording.
- Detect close published twins and move only the weaker-sourced version to draft.

## Sources and scheduling
- Change source collection to every 10 minutes.
- Repair Daily Guide Network and test public feeds for Modern Ghana, Ghana Police Service, OSP, EOCO, and CSA; activate only endpoints that return usable public news data.
- Backfill source images for the latest 50 published stories without hot-linking.
- Run one bounded ingest cycle and report fetched, kept, review, rejected, duplicate, and published totals.

## Verification
- Check desktop, 1024px, and tablet layouts for overflow and navigation behavior.
- Verify logged-out Admin visibility, image fallbacks, homepage section visibility, pipeline build health, and the ingest result.
