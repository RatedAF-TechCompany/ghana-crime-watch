# Live Worker source, 10 Nov 2026 indexing fix (traceability only — NOT a build input)

Live Worker `ghanacrimes` version **f74d89c0-399c-4d9c-82cc-027b20786dcd** (deployed 10 Nov 2026 04:50 GMT) was made by
patching the deployed bundle of version **ce659c58-2658-4f68-827e-aef84a8f83fb** (5 Nov 2026), because the source tree for
the 5 Nov deploy is not in GitHub. Do not build from this folder; it does not change main or PR #12.

- `worker-entry.ce659c58.ts` / `categories.ce659c58.ts`: recovered from the ce659c58 source map (live before the fix).
- `worker-entry.f74d89c0.ts`: the same file with the fix applied (equivalent of what is live now). `worker-entry.diff`: the change.
- `indexing-fix.ts`: the new redirect helpers. `patch_bundle.py`: the exact 9 string patches applied to the built bundle.
- Two Next.js app changes were patched in the bundle only (no source tree):
  - `app/sitemaps/[file]/route.ts`: on notices lookup failure, list neither /wanted nor /missing (see `sitemaps-route.diff`).
  - `app/robots.ts`: add `/dashboard` to the disallow list (after `/auth?`).
- When the 5 Nov source tree is found, port these changes into it before the next deploy, or the next deploy will undo them.

Rollback: `wrangler rollback ce659c58-2658-4f68-827e-aef84a8f83fb --name ghanacrimes`
