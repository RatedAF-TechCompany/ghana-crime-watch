// Edge wrapper around the OpenNext worker: canonical host + HTTPS before Next runs.
// @ts-ignore generated at build time by opennextjs-cloudflare
import handler from "./.open-next/worker.js";
import { pingIndexNow } from "./src/lib/indexnow";

// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

const CANONICAL_HOST = "www.ghanacrimes.com";
const REDIRECT_HOSTS = new Set(["ghanacrimes.com", "www.ghanacrimes.com"]);

export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (REDIRECT_HOSTS.has(url.hostname) && (url.protocol === "http:" || url.hostname !== CANONICAL_HOST)) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return new Response(null, { status: 301, headers: { Location: url.toString(), "Cache-Control": "public, max-age=3600" } });
    }
    // Form pages read their query (?article=, ?type=) in the browser, so render and cache one copy.
    if (QUERY_FREE_PATHS.has(url.pathname) && url.search && request.method === "GET" && !request.headers.has("rsc")) {
      url.search = "";
      request = new Request(url.toString(), request);
    }
    if (!isCacheable(request, url)) return (handler as any).fetch(request, env, ctx);
    return edgeCached(request, url, env, ctx as any);
  },
  // Every 15 min: ping IndexNow with articles published since the last run (publishing itself is untouched).
  async scheduled(_event: unknown, env: any, ctx: any): Promise<void> {
    ctx.waitUntil(pingRecentlyPublished(env));
  },
};

// Edge HTML cache (free Cache API). Next SSR costs ~300ms CPU per page, which trips the
// Workers free-plan CPU limit (error 1102) under crawler load. Serve anonymous GETs from
// the colo cache; refresh in the background once stale.
const QUERY_FREE_PATHS = new Set(["/corrections", "/tips", "/contact"]);
const FRESH_SECONDS = 300;
const MAX_STALE_SECONDS = 86400;
const NO_CACHE_PREFIXES = ["/admin", "/api", "/auth", "/_next/data"];

function isCacheable(request: Request, url: URL): boolean {
  if (request.method !== "GET") return false;
  if (NO_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p))) return false;
  if (url.searchParams.has("_rsc") || request.headers.has("rsc") || request.headers.has("next-router-state-tree")) return false;
  const cookie = request.headers.get("cookie") || "";
  if (/sb-|auth/i.test(cookie)) return false;
  return true;
}

async function fetchAndStore(request: Request, key: Request, env: unknown, ctx: any): Promise<Response> {
  const res: Response = await (handler as any).fetch(request, env, ctx);
  if (res.status === 200 && !res.headers.has("set-cookie")) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set("x-edge-cached-at", String(Date.now()));
    copy.headers.set("Cache-Control", `public, max-age=${MAX_STALE_SECONDS}`);
    ctx.waitUntil((caches as any).default.put(key, copy));
  } else if (res.status === 404 || res.status === 410) {
    // Page is gone (e.g. emptied section): evict the stale cached copy instead of serving it for a day.
    ctx.waitUntil((caches as any).default.delete(key));
  }
  return res;
}

async function edgeCached(request: Request, url: URL, env: unknown, ctx: any): Promise<Response> {
  const key = new Request(url.toString(), { method: "GET" });
  const cache = (caches as any).default as Cache;
  const hit = await cache.match(key);
  if (hit) {
    const at = Number(hit.headers.get("x-edge-cached-at") || 0);
    const age = (Date.now() - at) / 1000;
    const out = new Response(hit.body, hit);
    out.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    out.headers.set("x-edge-cache", age > FRESH_SECONDS ? "STALE" : "HIT");
    if (age > FRESH_SECONDS) ctx.waitUntil(fetchAndStore(request.clone(), key, env, ctx).catch(() => {}));
    return out;
  }
  return fetchAndStore(request, key, env, ctx);
}

async function pingRecentlyPublished(env: any): Promise<void> {
  const since = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const base = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const q = `${base}/rest/v1/articles?select=category_slug,article_slug&is_published=eq.true&or=(published_at.gte.${since},content_updated_at.gte.${since})&limit=500`;
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "ghanacrimes" } });
  if (!res.ok) { console.error("IndexNow: article query failed", res.status); return; }
  const rows = (await res.json()) as { category_slug: string; article_slug: string }[];
  if (!rows.length) return;
  const urls = rows.map((r) => `https://${CANONICAL_HOST}/${r.category_slug}/${r.article_slug}`);
  urls.push(`https://${CANONICAL_HOST}/`, `https://${CANONICAL_HOST}/latest`);
  console.log("IndexNow ping", urls.length, await pingIndexNow(urls));
}
