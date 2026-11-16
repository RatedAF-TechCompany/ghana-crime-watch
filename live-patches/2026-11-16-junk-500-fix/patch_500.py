# Idempotent exact-match patch of the ghanacrimes worker-entry.js bundle (input: c871c19a).
# Junk Next.js requests (scanner POSTs with a Next-Action header; RSC requests with a malformed
# Next-Router-State-Tree header) made Next throw and return 500, which fired Worker-error alert emails.
# The site has no Server Actions, so these now get a 404 / 400 at the edge before Next runs.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
MARK = "function nextJunkResponse(request)"
anchor = "async function handleFetch(request, env2, ctx) {\n"
hook_after = '      return new Response(await sendPushAlerts(env2));\n    }\n'
helper = '''// 16 Nov 2026: junk Next.js requests answered at the edge instead of crashing Next with a 500.
function nextJunkResponse(request) {
  const h = { "Content-Type": "text/plain", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (request.headers.has("next-action")) return new Response("Not Found", { status: 404, headers: h });
  const t = request.headers.get("next-router-state-tree");
  if (t !== null) {
    let ok = false;
    try {
      const v = JSON.parse(decodeURIComponent(t));
      ok = t.length <= 40000 && Array.isArray(v) && v.length >= 2 && (typeof v[0] === "string" || Array.isArray(v[0])) && v[1] !== null && typeof v[1] === "object" && !Array.isArray(v[1]);
    } catch {}
    if (!ok) return new Response("Bad Request", { status: 400, headers: h });
  }
  return null;
}
'''
hook = '''    const junk = nextJunkResponse(request);
    if (junk) return junk;
'''
if MARK in s:
    print("already patched"); open(out, "w", encoding="utf-8").write(s); sys.exit(0)
assert s.count(anchor) == 1, "anchor"
i = s.index(anchor)
j = s.index(hook_after, i)
assert j - i < 3000, "hook position"
s = s[:i] + helper + s[i:]
j = s.index(hook_after, s.index(anchor)) + len(hook_after)
s = s[:j] + hook + s[j:]
open(out, "w", encoding="utf-8").write(s)
print("patched")
