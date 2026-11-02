// Edge wrapper around the OpenNext worker: canonical host + HTTPS, then a cheap edge layer before Next runs.
// @ts-ignore generated at build time by opennextjs-cloudflare
import handler from "./.open-next/worker.js";
import { pingIndexNow } from "./src/lib/indexnow";
import { isValidCategory } from "./src/lib/categories";

// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

const CANONICAL_HOST = "www.ghanacrimes.com";
const REDIRECT_HOSTS = new Set(["ghanacrimes.com", "www.ghanacrimes.com"]);

// Permanent aliases handled at the edge (no Next render).
const EDGE_REDIRECTS: Record<string, string> = {
  "/ethics": "/editorial-policy",
  "/editorial-standards": "/editorial-policy",
  "/standards": "/editorial-policy",
  "/accountability": "/corrections",
  "/authors/ghanacrimes-data-desk": "/authors/ghanacrimes-newsroom",
  "/authors/ghanacrimes-desk": "/authors/ghanacrimes-newsroom",
  "/authors/ghanacrimes": "/authors/ghanacrimes-newsroom",
  "/about-us": "/about",
};

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const res = await handleFetch(request, env, ctx);
      if (res.status >= 500 && res.status !== 503) {
        const u = new URL(request.url);
        ctx.waitUntil(reportError(env, `HTTP ${res.status} ${u.pathname.split("/").slice(0, 2).join("/") || "/"}`,
          `${request.method} ${u.pathname}${u.search}\nStatus: ${res.status}\nVersion: ${DEPLOY_ID}`));
      }
      return res;
    } catch (e: any) {
      const u = new URL(request.url);
      ctx.waitUntil(reportError(env, `Exception ${String(e?.name || "Error")}: ${String(e?.message || e).slice(0, 80)}`,
        `${request.method} ${u.pathname}${u.search}\nVersion: ${DEPLOY_ID}\n\n${String(e?.stack || e).slice(0, 4000)}`));
      throw e;
    }
  },
  // Every 15 min: ping IndexNow with articles published since the last run and pre-render their share cards.
  async scheduled(_event: unknown, env: any, ctx: any): Promise<void> {
    ctx.waitUntil(pingRecentlyPublished(env, ctx).catch((e) => reportError(env, `Cron ${String(e?.message || e).slice(0, 80)}`, String(e?.stack || e))));
  },
};

// ---- Error alerts: email officeofnajib@gmail.com via the ghanacrimes.notifications queue (max 1 per type per hour) ----
const errorSeen = new Map<string, number>(); // per-isolate pre-filter; the database enforces the hourly limit globally
async function reportError(env: any, type: string, detail: string): Promise<void> {
  try {
    if (!env.GC_ALERT_SECRET) return;
    const t = Date.now();
    if ((errorSeen.get(type) ?? 0) > t - 3600_000) return;
    if (errorSeen.size > 500) errorSeen.clear();
    errorSeen.set(type, t);
    console.error("reportError", type);
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/report_worker_error`, {
      method: "POST",
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Content-Profile": "ghanacrimes", "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: env.GC_ALERT_SECRET, p_type: type, p_detail: detail }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* alerting must never break a request */ }
}

async function handleFetch(request: Request, env: any, ctx: any): Promise<Response> {
  {
    DEPLOY_ID ||= env.CF_VERSION_METADATA?.id || "";
    const url = new URL(request.url);
    if (REDIRECT_HOSTS.has(url.hostname) && (url.protocol === "http:" || url.hostname !== CANONICAL_HOST)) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return new Response(null, { status: 301, headers: { Location: url.toString(), "Cache-Control": "public, max-age=3600" } });
    }
    const alias = EDGE_REDIRECTS[url.pathname.replace(/\/+$/, "") || "/"];
    if (alias && request.method === "GET") {
      return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${alias}`, "Cache-Control": "public, max-age=86400" } });
    }
    // Category ?page=N duplicates page 1: send it to the real paginated URL (/cat/page/N).
    if (request.method === "GET" && url.searchParams.has("page")) {
      const seg = url.pathname.split("/").filter(Boolean);
      const n = Number(url.searchParams.get("page"));
      if (seg.length === 1 && isValidCategory(seg[0]) && Number.isInteger(n) && n >= 1 && n <= 10000) {
        const target = n === 1 ? `/${seg[0]}` : `/${seg[0]}/page/${n}`;
        return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${target}`, "Cache-Control": "public, max-age=86400" } });
      }
    }
    // Form pages read their query (?article=, ?type=) in the browser, so render and cache one copy.
    if (QUERY_FREE_PATHS.has(url.pathname) && url.search && request.method === "GET" && !request.headers.has("rsc")) {
      url.search = "";
      request = new Request(url.toString(), request);
    }
    if (request.method === "GET" && (url.pathname.startsWith("/api/og/") || url.pathname === "/api/og-image")) {
      return ogCached(request, url, env, ctx);
    }
    if (!isCacheable(request, url)) return (handler as any).fetch(request, env, ctx);
    // Unknown article URLs (mostly retired pre-migration slugs crawled by bots) get a cheap 404 without a Next render.
    const fast = await fastArticle404(request, url, env, ctx);
    if (fast) return fast;
    return edgeCached(request, url, env, ctx);
  }
}

// Edge HTML cache (free Cache API). Next SSR costs ~50-400ms CPU per page, which trips the Workers free-plan CPU
// limit (error 1102). Serve anonymous GETs (HTML and RSC payloads) from the colo cache; refresh in the background once stale.
const QUERY_FREE_PATHS = new Set(["/corrections", "/tips", "/contact"]);
const LIST_FRESH_SECONDS = 300;      // home, sections, hubs, feeds
const ARTICLE_FRESH_SECONDS = 1800;  // article pages change rarely after publish
const RSC_FRESH_SECONDS = 60;
const MAX_STALE_SECONDS = 7 * 86400;
const NOT_FOUND_SECONDS = 3600;
const NO_CACHE_PREFIXES = ["/admin", "/api", "/auth", "/_next/data", "/search", "/fraud-watch/search"];
// Click/tracking params never change the page; dropping them stops every shared link from forcing a fresh render.
const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|gbraid|wbraid|dclid|msclkid|igshid|mc_cid|mc_eid|_ga|_gl|ref|ref_src|s|si|cb|share|amp)$/i;

function cleanUrl(url: URL): URL {
  const u = new URL(url.toString());
  for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAM.test(k)) u.searchParams.delete(k);
  u.searchParams.delete("_rsc");
  u.searchParams.sort();
  return u;
}

function isCacheable(request: Request, url: URL): boolean {
  if (request.method !== "GET") return false;
  if (NO_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p))) return false;
  const cookie = request.headers.get("cookie") || "";
  if (/sb-|auth|gc_session/i.test(cookie)) return false;
  return true;
}

function isArticlePath(pathname: string): string[] | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !isValidCategory(parts[0])) return null;
  return parts;
}

async function shortHash(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Worker version id: cached HTML/RSC is keyed per deploy, so a new deploy never serves pages pointing at old JS chunks. */
let DEPLOY_ID = "";

async function cacheKeyFor(request: Request, url: URL): Promise<{ key: Request; fresh: number }> {
  const u = cleanUrl(url);
  if (DEPLOY_ID) u.searchParams.set("__v", DEPLOY_ID.slice(0, 8));
  if (request.headers.has("rsc")) {
    // RSC payloads depend on the client's router state; key on it so router.refresh() on /latest and nav hits are shared.
    const v = [request.headers.get("next-router-state-tree") || "", request.headers.get("next-router-prefetch") || "",
      request.headers.get("next-router-segment-prefetch") || "", request.headers.get("next-url") || ""].join("|");
    u.searchParams.set("__rsc", await shortHash(v));
    return { key: new Request(u.toString(), { method: "GET" }), fresh: RSC_FRESH_SECONDS };
  }
  return { key: new Request(u.toString(), { method: "GET" }), fresh: isArticlePath(u.pathname) ? ARTICLE_FRESH_SECONDS : LIST_FRESH_SECONDS };
}

async function fetchAndStore(request: Request, key: Request, env: unknown, ctx: any): Promise<Response> {
  const res: Response = await (handler as any).fetch(request, env, ctx);
  if (res.status === 200 && !res.headers.has("set-cookie")) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set("x-edge-cached-at", String(Date.now()));
    copy.headers.set("Cache-Control", `public, max-age=${MAX_STALE_SECONDS}`);
    copy.headers.delete("Vary");
    ctx.waitUntil((caches as any).default.put(key, copy));
  } else if (res.status === 404 || res.status === 410 || (res.status >= 301 && res.status <= 308)) {
    // Page is gone or now redirects (e.g. emptied section, unpublished story, duplicate merged into a kept URL):
    // evict the stale cached copy instead of serving it.
    ctx.waitUntil((caches as any).default.delete(key));
  }
  return res;
}

async function edgeCached(request: Request, url: URL, env: unknown, ctx: any): Promise<Response> {
  const { key, fresh } = await cacheKeyFor(request, url);
  const cache = (caches as any).default as Cache;
  const hit = await cache.match(key);
  if (hit) {
    const at = Number(hit.headers.get("x-edge-cached-at") || 0);
    const age = (Date.now() - at) / 1000;
    const out = new Response(hit.body, hit);
    out.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    out.headers.set("x-edge-cache", age > fresh ? "STALE" : "HIT");
    if (age > fresh && !(await refreshLocked(key))) ctx.waitUntil(fetchAndStore(request.clone(), key, env, ctx).catch(() => {}));
    return out;
  }
  return fetchAndStore(request, key, env, ctx);
}

/** One background refresh per key per colo per minute, so a burst of stale hits does not trigger a burst of renders. */
async function refreshLocked(key: Request): Promise<boolean> {
  const lockKey = new Request(`${key.url}${key.url.includes("?") ? "&" : "?"}__lock=1`);
  const cache = (caches as any).default as Cache;
  if (await cache.match(lockKey)) return true;
  await cache.put(lockKey, new Response("1", { headers: { "Cache-Control": "public, max-age=60" } }));
  return false;
}

// ---- Cheap 404 for unknown article URLs ----
const missingSlug = new Map<string, number>(); // slug -> time it was confirmed missing (per isolate)

async function slugExists(env: any, slug: string): Promise<boolean | null> {
  const stripped = slug.replace(/-(\d{10,}|[0-9a-z]{8,9})$/, "");
  const cacheKey = `${slug}|${stripped}`;
  const seen = missingSlug.get(cacheKey);
  if (seen && Date.now() - seen < 10 * 60 * 1000) return false; // re-check after 10 min in case it gets published
  const list = [...new Set([slug, stripped])].map((s) => `"${s.replace(/"/g, "")}"`).join(",");
  const q = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?select=id&article_slug=in.(${encodeURIComponent(list)})&limit=1`;
  try {
    const r = await fetch(q, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Accept-Profile": "ghanacrimes" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const rows = (await r.json()) as unknown[];
    const exists = rows.length > 0;
    if (!exists) { if (missingSlug.size > 5000) missingSlug.clear(); missingSlug.set(cacheKey, Date.now()); }
    return exists;
  } catch { return null; }
}

const routeMemo = new Map<string, { t: number; target: string | null }>(); // "cat/slug" -> redirect target (per isolate)

/** Redirect target for an unpublished article URL (article_route_state RPC), null if none, undefined on lookup error. */
async function routeRedirect(env: any, category: string, slug: string): Promise<string | null | undefined> {
  const k = `${category}/${slug}`;
  const m = routeMemo.get(k);
  if (m && Date.now() - m.t < 10 * 60 * 1000) return m.target;
  try {
    const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/article_route_state`, {
      method: "POST",
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Content-Profile": "ghanacrimes", "Content-Type": "application/json" },
      body: JSON.stringify({ _category: category, _slug: slug }),
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return undefined;
    const rows = (await r.json()) as { state: string; target: string | null }[];
    const row = Array.isArray(rows) ? rows[0] : null;
    const target = row?.state === "redirect" && row.target && /^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(row.target) ? row.target : null;
    if (routeMemo.size > 5000) routeMemo.clear();
    routeMemo.set(k, { t: Date.now(), target });
    return target;
  } catch { return undefined; }
}

async function fastArticle404(request: Request, url: URL, env: any, ctx: any): Promise<Response | null> {
  const parts = isArticlePath(url.pathname);
  if (!parts || request.headers.has("rsc")) return null;
  // Published or recently cached pages go through the normal path.
  const { key } = await cacheKeyFor(request, url);
  if (await ((caches as any).default as Cache).match(key)) return null;
  const exists = await slugExists(env, parts[1]);
  if (exists !== false) return null; // exists, or lookup failed: let Next decide (fail open)
  // Unpublished duplicates carry redirect_to: answer with a cheap edge 301 to the kept story instead of a 404.
  const target = await routeRedirect(env, parts[0], parts[1]);
  if (target === undefined) return null; // lookup failed: let Next decide
  if (target) return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${target}`, "Cache-Control": "public, max-age=600", "x-edge-cache": "REDIRECT" } });
  const body = await notFoundBody(env, ctx);
  return new Response(body, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", "X-Robots-Tag": "noindex", "x-edge-cache": "FAST404" } });
}

async function notFoundBody(env: any, ctx: any): Promise<string> {
  const key = new Request(`https://${CANONICAL_HOST}/__gc-not-found-page`);
  const cache = (caches as any).default as Cache;
  const hit = await cache.match(key);
  if (hit) return hit.text();
  const res: Response = await (handler as any).fetch(new Request(`https://${CANONICAL_HOST}/__gc-not-found-page`), env, ctx);
  const html = await res.text();
  ctx.waitUntil(cache.put(key, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": `public, max-age=${NOT_FOUND_SECONDS}` } })));
  return html;
}

// ---- Share images: Cache API (per colo) -> KV (global, free tier) -> render once ----
const OG_TTL = 30 * 86400;
let kvWritesThisIsolate = 0;

function ogKvKey(url: URL): string | null {
  if (!url.pathname.startsWith("/api/og/")) return null;
  const id = decodeURIComponent(url.pathname.slice(8));
  if (!/^([0-9a-f-]{36}|(topic|region|live)-[a-z0-9-]{1,80})$/i.test(id)) return null;
  const ar = url.searchParams.get("ar") || "16x9";
  return `og:v1:${id}:${/^(16x9|4x3|1x1)$/.test(ar) ? ar : "16x9"}`;
}

async function ogCached(request: Request, url: URL, env: any, ctx: any): Promise<Response> {
  const cache = (caches as any).default as Cache;
  const key = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) { const o = new Response(hit.body, hit); o.headers.set("x-edge-cache", "HIT"); return o; }
  const kvKey = ogKvKey(url);
  const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable" };
  if (kvKey && env.GC_OG) {
    const buf = await env.GC_OG.get(kvKey, "arrayBuffer");
    if (buf) {
      ctx.waitUntil(cache.put(key, new Response(buf, { headers })));
      return new Response(buf, { headers: { ...headers, "x-edge-cache": "KV" } });
    }
  }
  const res: Response = await (handler as any).fetch(request, env, ctx);
  if (res.status !== 200) return res;
  const buf = await res.arrayBuffer();
  const type = res.headers.get("content-type") || "image/png";
  const h = { ...headers, "Content-Type": type };
  ctx.waitUntil(cache.put(key, new Response(buf, { headers: h })));
  if (kvKey && env.GC_OG && kvWritesThisIsolate < 100 && type.startsWith("image/")) {
    kvWritesThisIsolate++;
    ctx.waitUntil(env.GC_OG.put(kvKey, buf, { expirationTtl: OG_TTL }).catch(() => {}));
  }
  return new Response(buf, { headers: { ...h, "x-edge-cache": "MISS" } });
}

async function pingRecentlyPublished(env: any, ctx: any): Promise<void> {
  const since = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const base = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const q = `${base}/rest/v1/articles?select=id,category_slug,article_slug,published_at&is_published=eq.true&or=(published_at.gte.${since},content_updated_at.gte.${since})&limit=500`;
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "ghanacrimes" } });
  if (!res.ok) { console.error("IndexNow: article query failed", res.status); return; }
  const rows = (await res.json()) as { id: string; category_slug: string; article_slug: string; published_at: string }[];
  if (!rows.length) return;
  if (rows.some((x) => x.published_at >= since)) ctx.waitUntil(sendPushAlerts(env).catch((e) => console.error("push failed", e)));
  const urls = rows.map((r) => `https://${CANONICAL_HOST}/${r.category_slug}/${r.article_slug}`);
  urls.push(`https://${CANONICAL_HOST}/`, `https://${CANONICAL_HOST}/latest`);
  console.log("IndexNow ping", urls.length, await pingIndexNow(urls));
  // Pre-render the default share card for up to 2 new stories into KV, so social crawlers never wait on a render.
  if (!env.GC_OG) return;
  for (const r of rows.filter((x) => x.published_at >= since).slice(0, 2)) {
    const u = new URL(`https://${CANONICAL_HOST}/api/og/${r.id}`);
    const k = ogKvKey(u);
    if (!k || (await env.GC_OG.get(k, "stream").then((s: any) => { s?.cancel?.(); return !!s; }))) continue;
    try {
      const img: Response = await (handler as any).fetch(new Request(u.toString()), env, ctx);
      if (img.ok) await env.GC_OG.put(k, await img.arrayBuffer(), { expirationTtl: OG_TTL });
    } catch (e) { console.error("og prerender failed", r.id, e); }
  }
}

// ---- Web push (payload-free VAPID): the service worker fetches /api/push/latest on each push. ----
// Max 4 sends per London day, only when a new story was published in the last cron window.
const VAPID_PUBLIC_KEY = "BNjdhkXSDckcdF7VuQVIDQ9XifEcqsHjjBNnsQJmKwAemtKv4af-cADXt96lQ3phKyvlwfK-lwOAxWj_S-I3C0w";
const PUSH_DAILY_CAP = 4;
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function vapidJwt(env: any, aud: string): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:editor@ghanacrimes.com" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}
async function sendPushAlerts(env: any): Promise<void> {
  if (!env.VAPID_PRIVATE_JWK || !env.GC_ALERT_SECRET || !env.GC_OG) return;
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const capKey = `push-count:${day}`;
  const sent = Number((await env.GC_OG.get(capKey)) || 0);
  if (sent >= PUSH_DAILY_CAP) return;
  const base = env.NEXT_PUBLIC_SUPABASE_URL, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rpc = (fn: string, body: unknown) => fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Profile": "ghanacrimes", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const res = await rpc("push_targets", { p_secret: env.GC_ALERT_SECRET });
  if (!res.ok) { console.error("push_targets", res.status); return; }
  const targets = (await res.json()) as { endpoint: string }[];
  if (!targets.length) return;
  await env.GC_OG.put(capKey, String(sent + 1), { expirationTtl: 2 * 86400 });
  const jwts = new Map<string, string>();
  for (const { endpoint } of targets.slice(0, 500)) {
    try {
      const aud = new URL(endpoint).origin;
      if (!jwts.has(aud)) jwts.set(aud, await vapidJwt(env, aud));
      const r = await fetch(endpoint, { method: "POST", headers: { TTL: "21600", Urgency: "high", Authorization: `vapid t=${jwts.get(aud)}, k=${VAPID_PUBLIC_KEY}` } });
      if (r.status === 404 || r.status === 410 || r.status >= 400) await rpc("push_result", { p_secret: env.GC_ALERT_SECRET, p_endpoint: endpoint, p_status: r.status });
    } catch (e) { console.error("push send", e); }
  }
}
