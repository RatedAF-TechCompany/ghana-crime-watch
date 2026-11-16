# Junk-request 500s → edge 404/400 (16 Nov 2026)

Request: Zeb, 16 Nov 2026 18:53 UK — stop the recurring "[GhanaCrimes] Worker error: HTTP 500 …" emails.

## Cause (from `wrangler tail`)
- `POST /` with a `Next-Action` header (scanner traffic; the site has no Server Actions) → Next throws
  `Error: No QueryClient set, use QueryClientProvider to set one` → 500. These were the "HTTP 500 /" emails.
- RSC requests (`?_rsc=` / `RSC: 1`) with a malformed `Next-Router-State-Tree` header → Next throws
  `The router state header was sent but could not be parsed.` → 500. These were the /map, /fraud-scams, /roundup,
  /courts, /top-stories emails. Normal page and RSC requests to the same URLs return 200.

## Fix
`nextJunkResponse()` in worker-entry.ts, run in `handleFetch` before Next: `Next-Action` → 404; unparseable router-state
header → 400. Real 500s still alert unchanged.

## Live
- Live Worker: 45523699-d376-4a43-8f99-0727e4e3adfe (v45, tag junk500-fix-20261116), 100% at ~18:59 UK 16 Nov 2026.
  Built by bundle patch on c871c19a (scripts here), not from this branch's build.
- Rollback: `wrangler rollback c871c19a-3cb5-4188-a90f-04de9da6138d --name ghanacrimes -y`
