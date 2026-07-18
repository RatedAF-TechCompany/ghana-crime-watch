// Shared tweet-source ingestion pipeline for GhanaWeb / GhChronicles / EDHUB.
// - All Lovable AI Gateway calls go through callGateway (JSON mode, token caps, 402/429 safe-fail).
// - Pre-AI dedupe via ai_rejects + processed_tweets.
// - Article generation retries once on JSON parse failure at 2200 tokens; on terminal failure the
//   processed_tweets row is deleted so the next cron run retries the item (never silently dropped).
// - Direct X posting removed from ingestion: ghanacrimes-autopost handles the X account on a schedule.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AiCreditError, callGateway, newUsage, parseJson } from "./ai-usage.ts";

export interface IngestConfig {
  username: string;          // X username to poll, e.g. "GhanaWeb"
  sourceKey: string;         // ingestion_logs.source value, e.g. "ghanaweb"
  sourceLabel: string;       // articles.author_name value, e.g. "GhanaWeb"
  headlineRule: string;      // extra headline guidance inserted into the article-gen prompt
  extraPromptRule?: string;  // extra bullet appended to Rules
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRIME_KEYWORDS = [
  "arrest", "police", "court", "murder", "robbery", "assault", "fraud",
  "theft", "investigation", "corrupt", "violence", "suspect", "charge",
  "jail", "prison", "shooting", "stabbing", "kidnap", "armed", "seized",
  "drug", "narcotics", "bail", "remand", "convict", "sentenced",
  "cybercrime", "scam", "galamsey", "smuggl", "rape", "abuse",
  "manslaughter", "accident", "deploy", "military", "soldier",
  "crime", "criminal", "offence", "offense", "victim", "dead", "killed",
  "gang", "wanted", "manhunt", "operation", "crackdown", "fire",
  "warrant", "bench warrant", "destroy", "property destruction",
];
const IGNORE_KEYWORDS = [
  "opinion:", "my take", "i think", "entertainment", "music video",
  "happy birthday", "congratulations", "good morning", "lol", "😂",
  "sports", "football", "black stars", "premier league",
];

const VALID_CATEGORIES = [
  "top-stories", "violent-crime", "property-crime", "cybercrime", "fraud-scams",
  "drug-offences", "domestic-violence", "traffic-offences", "youth-crime",
  "organised-crime", "white-collar-crime", "police-reports", "court-cases",
  "prison-news", "crime-prevention", "investigations", "most-wanted",
];

function isCrimeRelated(text: string): boolean {
  const lower = text.toLowerCase();
  for (const ignore of IGNORE_KEYWORDS) if (lower.includes(ignore)) return false;
  return CRIME_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---- OAuth 1.0a helpers (X API) ----
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21").replace(/\*/g, "%2A")
    .replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
}
async function hmacSha1(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let n = ""; for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}
async function createOAuthHeader(
  method: string, url: string, params: Record<string, string>,
  ck: string, cs: string, at: string, ats: string,
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: ck,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: at,
    oauth_version: "1.0",
  };
  const all = { ...oauthParams, ...params };
  const sorted = Object.keys(all).sort().map((k) => `${percentEncode(k)}=${percentEncode(all[k])}`).join("&");
  const base = `${method}&${percentEncode(url)}&${percentEncode(sorted)}`;
  const signingKey = `${percentEncode(cs)}&${percentEncode(ats)}`;
  oauthParams["oauth_signature"] = await hmacSha1(signingKey, base);
  return `OAuth ${Object.keys(oauthParams).sort().map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(", ")}`;
}

// ---- Pre-AI dedupe helpers ----
async function sha1Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function normTitleForHash(t: string): string {
  return (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).slice(0, 12).join(" ");
}
async function tweetTitleHash(text: string): Promise<string | null> {
  const n = normTitleForHash(text);
  return n ? await sha1Hex(n) : null;
}

// ---- Plain sentence-case fallback for the twitter_post column (no AI). ----
// ghanacrimes-autopost owns publishing to X; this value is just a record.
function fallbackTweet(title: string): string {
  let t = (title || "").trim().replace(/[.!?…]+$/, "").trim() + ".";
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 260) {
    const cut = t.lastIndexOf(" ", 258);
    t = t.substring(0, cut > 0 ? cut : 258).replace(/[.,;:!?\s]+$/, "") + ".";
  }
  return t;
}

// ---- Article generation (JSON mode, retry once on parse failure) ----
async function generateArticleJson(
  apiKey: string, usage: ReturnType<typeof newUsage>,
  cfg: IngestConfig, tweetText: string,
): Promise<{ ok: true; data: any; parseFailures: number } | { ok: false; parseFailures: number; error: string }> {
  const system = "You are a professional news editor for GhanaCrimes.com. Return ONLY a valid JSON object matching the requested shape.";
  const user = `Convert this tweet from ${cfg.sourceLabel} (@${cfg.username}) into a short crime news article.

Tweet: "${tweetText}"

Return a JSON object with these fields:
{
  "headline": "${cfg.headlineRule}",
  "body": "<p>Short intro paragraph with key facts.</p><p>Details paragraph with context.</p>",
  "summary": "2-3 sentence summary under 200 chars",
  "category": "One of: ${VALID_CATEGORIES.join(", ")}",
  "tags": ["crime", "police", "ghana", "..."],
  "seo_description": "SEO description under 160 chars"
}

Rules:
- Maintain journalistic objectivity
- Use Ghana-specific context
- Respect presumption of innocence
- Do not credit or name any source${cfg.extraPromptRule ? "\n- " + cfg.extraPromptRule : ""}`;

  let parseFailures = 0;

  // Attempt 1: 1800 tokens
  try {
    const res = await callGateway(apiKey, usage, { system, user, max_tokens: 1800, temperature: 0.3, json: true });
    try { return { ok: true, data: parseJson(res.content), parseFailures }; }
    catch { parseFailures += 1; }
  } catch (e) {
    if (e instanceof AiCreditError) throw e;
    return { ok: false, parseFailures, error: (e as Error).message };
  }

  // Attempt 2: 2200 tokens
  try {
    const res = await callGateway(apiKey, usage, { system, user, max_tokens: 2200, temperature: 0.3, json: true });
    try { return { ok: true, data: parseJson(res.content), parseFailures }; }
    catch { parseFailures += 1; return { ok: false, parseFailures, error: "json_parse_failed_twice" }; }
  } catch (e) {
    if (e instanceof AiCreditError) throw e;
    return { ok: false, parseFailures, error: (e as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────
export async function runTweetIngest(req: Request, cfg: IngestConfig): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET")!;
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN")!;
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const usage = newUsage();
  let jsonParseFailures = 0;
  let creditHalted: string | null = null;

  const log = async (eventType: string, details: Record<string, unknown>) => {
    await supabase.from("ingestion_logs").insert({ source: cfg.sourceKey, event_type: eventType, details });
  };

  try {
    // 1) Resolve user id
    const userLookupUrl = "https://api.x.com/2/users/by/username/" + cfg.username;
    const userAuth = await createOAuthHeader("GET", userLookupUrl, {}, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    const userRes = await fetch(userLookupUrl, { headers: { Authorization: userAuth } });
    if (!userRes.ok) {
      const errText = await userRes.text();
      await log("error", { step: "user_lookup", status: userRes.status, error: errText });
      return new Response(JSON.stringify({ error: "User lookup failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = (await userRes.json()).data?.id;
    if (!userId) {
      await log("error", { step: "user_lookup", error: "No user ID found" });
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Fetch recent tweets
    const tweetsUrl = `https://api.x.com/2/users/${userId}/tweets`;
    const tweetParams: Record<string, string> = {
      "max_results": "10",
      "tweet.fields": "created_at,attachments,text",
      "expansions": "attachments.media_keys",
      "media.fields": "url,preview_image_url,type",
      "exclude": "retweets,replies",
    };
    const tweetsAuth = await createOAuthHeader("GET", tweetsUrl, tweetParams, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    const qs = Object.entries(tweetParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    const tweetsRes = await fetch(`${tweetsUrl}?${qs}`, { headers: { Authorization: tweetsAuth } });
    if (!tweetsRes.ok) {
      const errText = await tweetsRes.text();
      await log("error", { step: "fetch_tweets", status: tweetsRes.status, error: errText });
      return new Response(JSON.stringify({ error: "Failed to fetch tweets" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const tweetsData = await tweetsRes.json();
    const tweets = tweetsData.data || [];
    const mediaMap: Record<string, string> = {};
    if (tweetsData.includes?.media) {
      for (const m of tweetsData.includes.media) if (m.media_key) mediaMap[m.media_key] = m.url || m.preview_image_url || "";
    }

    // 3) Look up existing queue rows for these tweet ids — decide per-tweet: skip, retry, or new.
    //    Retry ceiling: >=3 failed attempts → mark dead_letter, never retry.
    //    Backoff: pending rows that failed recently sleep for attempts * 30 min before retrying.
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS_PER_ATTEMPT = 30 * 60 * 1000;
    const tweetIds = tweets.map((t: any) => t.id);
    const { data: existing } = await supabase
      .from("processed_tweets")
      .select("tweet_id, processing_status, attempts, last_attempt_at")
      .in("tweet_id", tweetIds);
    const existingById = new Map<string, any>((existing || []).map((e: any) => [e.tweet_id, e]));

    // Auto-dead-letter any pending rows already over the ceiling (from prior runs before this fix).
    const overCeiling = (existing || []).filter((e: any) => e.processing_status === "pending" && (e.attempts || 0) >= MAX_ATTEMPTS);
    if (overCeiling.length > 0) {
      await supabase.from("processed_tweets")
        .update({ processing_status: "dead_letter" })
        .in("tweet_id", overCeiling.map((e: any) => e.tweet_id));
      for (const e of overCeiling) existingById.set(e.tweet_id, { ...e, processing_status: "dead_letter" });
    }

    // Classify: which tweets are actually eligible for processing this run?
    let deadLetterCount = 0;
    let backoffSkipped = 0;
    const eligibleTweets = tweets.filter((t: any) => {
      const row = existingById.get(t.id);
      if (!row) return true; // brand new
      if (row.processing_status !== "pending") return false; // terminal status (published/skipped_*/dead_letter/failed)
      if ((row.attempts || 0) >= MAX_ATTEMPTS) { deadLetterCount++; return false; }
      if (row.last_attempt_at) {
        const nextEligible = new Date(row.last_attempt_at).getTime() + (row.attempts || 0) * BACKOFF_MS_PER_ATTEMPT;
        if (Date.now() < nextEligible) { backoffSkipped++; return false; }
      }
      return true; // pending + under ceiling + past backoff window
    });

    if (eligibleTweets.length === 0) {
      await log("poll", {
        tweets_found: tweets.length, eligible: 0,
        backoff_skipped: backoffSkipped, dead_lettered_now: overCeiling.length,
        ai_calls: usage.calls,
      });
      return new Response(JSON.stringify({ success: true, processed: 0, backoff_skipped: backoffSkipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3b) Pre-AI ai_rejects lookup (by tweet-text title hash)
    const hashes = await Promise.all(eligibleTweets.map(async (t: any) => ({ id: t.id, h: await tweetTitleHash(t.text || "") })));
    const hashList = hashes.map((x) => x.h).filter((h): h is string => !!h);
    const rejectedHashes = new Set<string>();
    if (hashList.length > 0) {
      const { data: rejects } = await supabase
        .from("ai_rejects").select("title_hash")
        .in("title_hash", hashList);
      for (const r of rejects || []) if (r.title_hash) rejectedHashes.add(r.title_hash);
    }
    const hashById = new Map(hashes.map((x) => [x.id, x.h] as const));

    let processed = 0;

    // Helper: record a per-item terminal failure (increments attempts, dead-letters at ceiling).
    // Never called on AiCreditError — credit halts are not the item's fault.
    const recordItemFailure = async (row: any | undefined, tweetId: string, tweetText: string, mediaUrls: string[], errorMsg: string) => {
      const prevAttempts = row?.attempts || 0;
      const nextAttempts = prevAttempts + 1;
      const nextStatus = nextAttempts >= MAX_ATTEMPTS ? "dead_letter" : "pending";
      if (row) {
        await supabase.from("processed_tweets").update({
          processing_status: nextStatus,
          attempts: nextAttempts,
          last_error: errorMsg.slice(0, 500),
          last_attempt_at: new Date().toISOString(),
        }).eq("tweet_id", tweetId);
      } else {
        await supabase.from("processed_tweets").insert({
          tweet_id: tweetId, author_username: cfg.username, tweet_text: tweetText,
          tweet_created_at: null, tweet_media_urls: mediaUrls,
          processing_status: nextStatus,
          attempts: nextAttempts,
          last_error: errorMsg.slice(0, 500),
          last_attempt_at: new Date().toISOString(),
        });
      }
      if (nextStatus === "dead_letter") deadLetterCount++;
    };

    for (const tweet of eligibleTweets) {
      if (creditHalted) break; // stop cleanly on 402/429; remaining stay pending (attempts NOT bumped)

      const tweetText = tweet.text || "";
      const tweetId = tweet.id;
      const existingRow = existingById.get(tweetId);
      const tweetMediaUrls: string[] = [];
      if (tweet.attachments?.media_keys) {
        for (const mk of tweet.attachments.media_keys) if (mediaMap[mk]) tweetMediaUrls.push(mediaMap[mk]);
      }

      // Pre-AI gate: previously-rejected tweet text (terminal, does not count as an attempt)
      const th = hashById.get(tweetId);
      if (th && rejectedHashes.has(th)) {
        if (existingRow) {
          await supabase.from("processed_tweets").update({ processing_status: "skipped_ai_reject" }).eq("tweet_id", tweetId);
        } else {
          await supabase.from("processed_tweets").insert({
            tweet_id: tweetId, author_username: cfg.username, tweet_text: tweetText,
            tweet_created_at: tweet.created_at, tweet_media_urls: tweetMediaUrls,
            processing_status: "skipped_ai_reject",
          });
        }
        await log("skipped", { tweet_id: tweetId, reason: "ai_reject_hash" });
        continue;
      }

      // Ensure a pending row exists so retries and the admin view can track this tweet.
      if (!existingRow) {
        await supabase.from("processed_tweets").insert({
          tweet_id: tweetId, author_username: cfg.username, tweet_text: tweetText,
          tweet_created_at: tweet.created_at, tweet_media_urls: tweetMediaUrls,
          processing_status: "pending",
        });
      }

      // Cheap crime filter (terminal — write rejection to ai_rejects so future runs skip for free)
      if (!isCrimeRelated(tweetText)) {
        await supabase.from("processed_tweets").update({ processing_status: "skipped_not_crime" }).eq("tweet_id", tweetId);
        if (th) await supabase.from("ai_rejects").insert({ title_hash: th, reason: "not_crime_related", detail: cfg.sourceKey }).then(() => {}, () => {});
        await log("skipped", { tweet_id: tweetId, reason: "not_crime_related" });
        continue;
      }

      if (!lovableApiKey) {
        await recordItemFailure(existingRow, tweetId, tweetText, tweetMediaUrls, "AI not configured");
        continue;
      }

      try {
        const gen = await generateArticleJson(lovableApiKey, usage, cfg, tweetText);
        jsonParseFailures += gen.parseFailures;

        if (!gen.ok) {
          // Genuine per-item failure — bump attempts, dead-letter at ceiling.
          await recordItemFailure(existingRow, tweetId, tweetText, tweetMediaUrls, gen.error);
          await log("error", { tweet_id: tweetId, step: "ai_generate", error: gen.error, attempts: (existingRow?.attempts || 0) + 1 });
          continue;
        }

        const articleData = gen.data;
        const articleSlug = String(articleData.headline || "")
          .toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 100);
        const { data: existingSlug } = await supabase.from("articles").select("id").eq("article_slug", articleSlug).maybeSingle();
        const finalSlug = existingSlug ? `${articleSlug}-${Date.now().toString(36)}` : articleSlug;

        const category = VALID_CATEGORIES.includes(articleData.category) ? articleData.category : "police-reports";
        const gcTweet = fallbackTweet(articleData.headline || "");

        // Hero image: prefer attached tweet media, fall back to shared URL extractor
        let heroImage: string | null = null;
        if (tweetMediaUrls.length > 0) {
          try {
            const imgResp = await fetch(tweetMediaUrls[0], { headers: { "User-Agent": "Mozilla/5.0 (compatible; GhanaCrimes/1.0)", "Accept": "image/*" } });
            if (imgResp.ok) {
              const contentType = imgResp.headers.get("content-type") || "image/jpeg";
              const buffer = new Uint8Array(await imgResp.arrayBuffer());
              const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
              const imgPath = `tweets/${finalSlug}.${ext}`;
              const { error: upErr } = await supabase.storage.from("article-images").upload(imgPath, buffer, { contentType, upsert: true });
              if (!upErr) heroImage = supabase.storage.from("article-images").getPublicUrl(imgPath).data.publicUrl;
            }
          } catch (e) { console.error("Tweet image upload failed:", e); }
        }
        if (!heroImage) {
          try {
            const { extractHeroImage, extractUrls } = await import("./extract-image.ts");
            for (const u of extractUrls(tweetText)) {
              const r = await extractHeroImage({ articleUrl: u }, finalSlug, supabase);
              if (r.url) { heroImage = r.url; break; }
            }
          } catch (e) { console.error("Shared extractor failed:", e); }
        }

        const { data: article, error: insertErr } = await supabase.from("articles").insert({
          title: articleData.headline,
          subtitle: null,
          summary: articleData.summary || articleData.headline,
          body: articleData.body,
          category_slug: category,
          article_slug: finalSlug,
          author_name: cfg.sourceLabel,
          tags: articleData.tags || ["crime", "police", "ghana"],
          seo_title: articleData.headline,
          seo_description: articleData.seo_description || articleData.summary,
          hero_image: heroImage,
          is_published: true,
          published_at: new Date().toISOString(),
          twitter_post: gcTweet,
        }).select("id").single();

        if (insertErr || !article) {
          await recordItemFailure(existingRow, tweetId, tweetText, tweetMediaUrls, insertErr?.message || "Insert failed");
          await log("error", { tweet_id: tweetId, step: "insert_article", error: insertErr?.message });
          continue;
        }

        await supabase.from("processed_tweets").update({
          processing_status: "published",
          generated_article_id: article.id,
          last_attempt_at: new Date().toISOString(),
        }).eq("tweet_id", tweetId);
        await log("published", { tweet_id: tweetId, article_id: article.id, headline: articleData.headline });
        // NOTE: direct X posting removed — ghanacrimes-autopost owns the @ghanacrimes account on a schedule.
        processed++;
      } catch (err) {
        if (err instanceof AiCreditError) {
          // Credit halt is NOT the item's fault — do not increment attempts, do not touch last_attempt_at.
          // Leave the row as-is so this item is first-in-line next cron with no backoff penalty.
          creditHalted = err.message;
          await log("halted_credit", { status: err.status, message: err.message });
          break;
        }
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        await recordItemFailure(existingRow, tweetId, tweetText, tweetMediaUrls, errMsg);
        await log("error", { tweet_id: tweetId, step: "processing", error: errMsg });
      }
    }

    await log("poll_complete", {
      tweets_found: tweets.length,
      eligible: eligibleTweets.length,
      articles_published: processed,
      backoff_skipped: backoffSkipped,
      dead_letter: deadLetterCount,
      credit_halted: creditHalted,
      ai_calls: usage.calls,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      estimated_cost: Number(usage.estimated_cost.toFixed(6)),
      json_parse_failures: jsonParseFailures,
    });

    return new Response(JSON.stringify({
      success: true, processed, eligible: eligibleTweets.length,
      backoff_skipped: backoffSkipped, dead_letter: deadLetterCount,
      credit_halted: creditHalted,
      ai: { calls: usage.calls, cost: Number(usage.estimated_cost.toFixed(6)) },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`${cfg.sourceKey} ingestion error:`, errMsg);
    await log("fatal_error", { error: errMsg, ai_calls: usage.calls, estimated_cost: Number(usage.estimated_cost.toFixed(6)) });
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}
