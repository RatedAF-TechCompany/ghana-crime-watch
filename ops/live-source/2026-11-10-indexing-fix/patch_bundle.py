#!/usr/bin/env python3
"""Apply the 10 Nov 2026 indexing patches to the live worker-entry.js bundle. Each `old` must occur exactly once.
Usage: patch_bundle.py <in.js> <indexing-fix.js> <out.js> <patches.json>"""
import sys, json, hashlib
src, fixjs, out, pj = sys.argv[1:5]
s = open(src, encoding='utf-8').read()
fix = open(fixjs, encoding='utf-8').read()
P = []
# 1. new helper block after truncatedSection
P.append(('__name(truncatedSection, "truncatedSection");\n',
          '__name(truncatedSection, "truncatedSection");\n' + fix + '\n'))
# 2. host redirect: resolve the final target in the same hop
P.append(('''      url.port = "";
      return new Response(null, { status: 301, headers: { Location: url.toString(), "Cache-Control": "public, max-age=3600" } });''',
'''      url.port = "";
      if (request.method === "GET" || request.method === "HEAD") {
        const v = await variantTarget(env2, url, true).catch(() => null);
        if (v) return permanent(v.to, 600, `host+${v.rule}`);
      }
      return new Response(null, { status: 301, headers: { Location: url.toString(), "Cache-Control": "public, max-age=3600" } });'''))
# 3. drop the separate truncated-section and alias blocks (now inside variantTarget, one hop)
P.append(('''    if (request.method === "GET") {
      const segs = url.pathname.split("/").filter(Boolean);
      const sec = segs.length === 1 ? truncatedSection(segs[0]) : null;
      if (sec) return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}/${sec}`, "Cache-Control": "public, max-age=86400" } });
    }
    const alias = EDGE_REDIRECTS[url.pathname.replace(/\\/+$/, "") || "/"];
    if (alias && request.method === "GET") {
      return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${alias}`, "Cache-Control": "public, max-age=86400" } });
    }
''', ''))
# 4. variant redirects after the ?page= block
P.append(('''        return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${target}`, "Cache-Control": "public, max-age=86400" } });
      }
    }
    if (QUERY_FREE_PATHS''',
'''        return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${target}`, "Cache-Control": "public, max-age=86400" } });
      }
    }
    if (request.method === "GET" || request.method === "HEAD") {
      const v = await variantTarget(env2, url, false).catch(() => null);
      if (v) return permanent(v.to, /retired|latest|section-filter|tag-or-category/.test(v.rule) ? 600 : 86400, v.rule);
    }
    if (QUERY_FREE_PATHS'''))
# 5. Next 404s -> section index / noindex
P.append(('''    if (fast) return fast;
    return edgeCached(request, url, env2, ctx);''',
'''    if (fast) return fast;
    return after404(request, url, env2, await edgeCached(request, url, env2, ctx));'''))
# 6. fastArticle404: retired story -> its section index (was: 404)
P.append(('''  const exists2 = await slugExists(env2, parts[1]);
  if (exists2 !== false) return null;
  const target = await routeRedirect(env2, parts[0], parts[1]);
  if (target === void 0) return null;
  if (target) return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${target}`, "Cache-Control": "public, max-age=600", "x-edge-cache": "REDIRECT" } });
  const full = await truncatedSlugTarget(env2, parts[1]);
  if (full) return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${full}`, "Cache-Control": "public, max-age=3600", "x-edge-cache": "REDIRECT" } });
  const body = await notFoundBody(env2, ctx);
  return new Response(body, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", "X-Robots-Tag": "noindex", "x-edge-cache": "FAST404" } });''',
'''  const t = await articleTarget(env2, parts[0], parts[1]);
  if (!t) return null;
  return permanent(t.to, t.rule === "retired-to-section" ? 600 : 3600, t.rule);'''))
# 7. sitemaps/feeds: never hand out a copy older than 15 min (render first, fall back to the stale copy)
P.append(('''async function edgeCached(request, url, env2, ctx) {
  const { key, fresh } = await cacheKeyFor(request, url);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) {''',
'''var FEED_PATH = /^\\/(sitemap\\.xml|news-sitemap\\.xml|sitemaps\\/[a-z0-9-]+\\.xml|rss\\.xml|feed\\.xml|podcast\\.xml|[a-z0-9\\/-]+\\/rss\\.xml)$/;
var FEED_MAX_STALE_SERVE_SECONDS = 900;
async function edgeCached(request, url, env2, ctx) {
  const { key, fresh } = await cacheKeyFor(request, url);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit && FEED_PATH.test(url.pathname) && !request.headers.has("rsc")) {
    const age = (Date.now() - Number(hit.headers.get("x-edge-cached-at") || 0)) / 1e3;
    if (age > FEED_MAX_STALE_SERVE_SECONDS) {
      try {
        const res = await fetchAndStore(request.clone(), key, env2, ctx);
        if (res.status === 200) {
          const out = new Response(res.body, res);
          out.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
          out.headers.set("x-edge-cache", "REFRESHED");
          return out;
        }
      } catch {
      }
    }
  }
  if (hit) {'''))
# 8. pages.xml: on notices lookup failure omit /wanted and /missing (they render noindex when empty)
P.append(('''                b4 = ["/wanted", "/missing"];''', '''                b4 = [];'''))
# 9. robots.txt: also disallow /dashboard
P.append(('''y = ["/admin/", "/auth$", "/auth/", "/auth?", "/api/", "/search", "/fraud-watch/search"]''',
          '''y = ["/admin/", "/auth$", "/auth/", "/auth?", "/dashboard", "/api/", "/search", "/fraud-watch/search"]'''))
for i, (a, b) in enumerate(P, 1):
    n = s.count(a)
    if n != 1: sys.exit(f'patch {i}: expected 1 occurrence, found {n}')
    s = s.replace(a, b)
open(out, 'w', encoding='utf-8').write(s)
json.dump([{'old': a, 'new': b} for a, b in P], open(pj, 'w'))
print('ok', len(P), 'patches; sha256', hashlib.sha256(s.encode()).hexdigest())
