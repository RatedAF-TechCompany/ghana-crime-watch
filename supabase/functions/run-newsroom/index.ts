import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AiCreditError, callGateway, newUsage, parseJson, type AiUsage } from "../_shared/ai-usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════
// PRE-AI FILTERING HELPERS
// Deterministic gates that keep out-of-scope / already-seen items from
// ever reaching the AI. Every rejection is recorded in ai_rejects so
// future runs skip the same item for zero AI cost.
// ═══════════════════════════════════════════════════════════════════
async function sha1Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normUrlForHash(u: string | null | undefined): string {
  if (!u) return "";
  return u.trim().toLowerCase().replace(/[#?].*$/, "").replace(/\/$/, "");
}

function normTitleForHash(t: string | null | undefined): string {
  return (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).slice(0, 12).join(" ");
}

async function itemHashes(item: any): Promise<{ url_hash: string | null; title_hash: string | null }> {
  const urlN = normUrlForHash(item.source_url);
  const titleN = normTitleForHash(item.original_headline || item.headline);
  return {
    url_hash: urlN ? await sha1Hex(urlN) : null,
    title_hash: titleN ? await sha1Hex(titleN) : null,
  };
}

// Hard-reject: obvious non-crime slot keywords in headline+summary.
const HARD_OUT_OF_SCOPE = [
  " afcon ", " world cup ", " premier league ", " match ", " goal ", " goals ", " striker ",
  " coach ", " transfer ", " squad ", " fixture ", " kickoff ", " kick-off ",
  " concert ", " album ", " song ", " lyrics ", " music video ", " movie ", " film ",
  " trailer ", " actor ", " actress ", " celebrity ", " award ", " nominat",
  " fashion ", " designer ", " wedding ", " engagement ", " birthday ",
  " reality show ", " talent show ", " miss ghana ", " ghana idol ",
];

// Hard-accept: obvious in-scope crime signal in headline. Skip AI classifier entirely.
const HARD_IN_SCOPE = [
  "arrest", "arrested", "murder", "murdered", "homicide", "robbery", "armed robber",
  "kidnap", "abduct", "rape", "defilement", "defiled", "assault", "stabbed", "shot dead",
  "shooting", "fraud", "scam", "cybercrime", "hacked", "drug bust", "drug seizure",
  "cocaine", "cannabis", "tramadol", "money laundering", "corruption charge", "bribery",
  "human trafficking", "smuggl", "extortion", "convicted", "sentenced to", "remanded",
  "manhunt", "most wanted", "police arrest", "court charges", "court remands",
  "eoco", "nacoc", "osp probe",
];

function cheapGate(item: any): "accept" | "reject" | "unknown" {
  const text = ` ${String(item.original_headline || item.headline || "").toLowerCase()} ${String(item.original_summary || item.summary || "").toLowerCase()} `;
  for (const k of HARD_OUT_OF_SCOPE) if (text.includes(k)) return "reject";
  const headline = ` ${String(item.original_headline || item.headline || "").toLowerCase()} `;
  for (const k of HARD_IN_SCOPE) if (headline.includes(k)) return "accept";
  return "unknown";
}

async function filterByAiRejects(supabase: any, items: any[]): Promise<{ kept: any[]; skipped: number }> {
  if (items.length === 0) return { kept: [], skipped: 0 };
  const withHashes = await Promise.all(items.map(async (it) => ({ it, h: await itemHashes(it) })));
  const allHashes = new Set<string>();
  for (const { h } of withHashes) {
    if (h.url_hash) allHashes.add(h.url_hash);
    if (h.title_hash) allHashes.add(h.title_hash);
  }
  if (allHashes.size === 0) return { kept: items, skipped: 0 };
  const hashArr = Array.from(allHashes);
  const { data } = await supabase
    .from("ai_rejects")
    .select("url_hash, title_hash")
    .or(`url_hash.in.(${hashArr.map((h) => `"${h}"`).join(",")}),title_hash.in.(${hashArr.map((h) => `"${h}"`).join(",")})`);
  const seen = new Set<string>();
  for (const r of data || []) {
    if (r.url_hash) seen.add(r.url_hash);
    if (r.title_hash) seen.add(r.title_hash);
  }
  const kept = withHashes.filter(({ h }) => !(h.url_hash && seen.has(h.url_hash)) && !(h.title_hash && seen.has(h.title_hash))).map((x) => x.it);
  return { kept, skipped: items.length - kept.length };
}

async function recordAiRejects(supabase: any, items: any[], reason: string, detail?: string) {
  if (items.length === 0) return;
  const rows = await Promise.all(items.map(async (it) => {
    const h = await itemHashes(it);
    return { url_hash: h.url_hash, title_hash: h.title_hash, reason, detail: detail || null };
  }));
  await supabase.from("ai_rejects").insert(rows);
}

// Source list — for sources that offer a section-specific crime/justice feed, we use it.
// Sources without a section feed use the general feed and rely on the AI scope gate below.
// The public.sources table mirrors this for reporting (requires_topic_gate flag).
const NEWS_SOURCES = [
  { name: "GhanaWeb Crime", domain: "ghanaweb.com", rss: "https://www.ghanaweb.com/GhanaHomePage/crime/rss.xml" },
  { name: "GhanaWeb News", domain: "ghanaweb.com", rss: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml" },
  { name: "Citi Newsroom", domain: "citinewsroom.com", rss: "https://citinewsroom.com/category/general/crime/feed/" },
  { name: "MyJoyOnline", domain: "myjoyonline.com", rss: "https://www.myjoyonline.com/category/news/crime/feed/" },
  { name: "Graphic Online", domain: "graphic.com.gh", rss: "https://www.graphic.com.gh/feed" },
  { name: "3News", domain: "3news.com", rss: "https://3news.com/feed/" },
  { name: "UTV Ghana", domain: "utvghana.com", rss: null },
  { name: "Metro TV Ghana", domain: "metrotvonline.com", rss: null },
  { name: "Peace FM Online", domain: "peacefmonline.com", rss: "https://www.peacefmonline.com/pages/local/crime/rss.xml" },
  { name: "Adom Online", domain: "adomonline.com", rss: "https://www.adomonline.com/feed/" },
  { name: "Starr FM", domain: "starrfm.com.gh", rss: "https://starrfm.com.gh/feed/" },
  { name: "Pulse Ghana", domain: "pulse.com.gh", rss: "https://www.pulse.com.gh/rss" },
  { name: "Modern Ghana", domain: "modernghana.com", rss: "https://www.modernghana.com/rss/" },
  { name: "News Ghana", domain: "newsghana.com.gh", rss: "https://newsghana.com.gh/feed/" },
  { name: "The Chronicle Ghana", domain: "thechronicle.com.gh", rss: "https://thechronicle.com.gh/feed/" },
  { name: "Daily Guide Network", domain: "dailyguidenetwork.com", rss: "https://dailyguidenetwork.com/feed/" },
  { name: "The Finder Online", domain: "thefinderonline.com", rss: null },
  { name: "Ghanaian Times", domain: "ghanaiantimes.com.gh", rss: "https://www.ghanaiantimes.com.gh/feed/" },
  { name: "GBC Ghana Online", domain: "gbcghanaonline.com", rss: "https://www.gbcghanaonline.com/feed/" },
  { name: "Asaase Radio", domain: "asaaseradio.com", rss: "https://asaaseradio.com/feed/" },
  { name: "Atinka Online", domain: "atinkaonline.com", rss: "https://atinkaonline.com/feed/" },
];

// ═══════════════════════════════════════════════════════════════════
// Title similarity (Dice coefficient on character bigrams — approximates pg_trgm)
// Used for duplicate detection at ingestion.
// ═══════════════════════════════════════════════════════════════════
function normTitle(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function charBigrams(s: string): Set<string> {
  const t = normTitle(s);
  const set = new Set<string>();
  if (t.length < 2) return set;
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}
function titleSimilarity(a: string, b: string): number {
  const A = charBigrams(a), B = charBigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// ═══════════════════════════════════════════════════════════════════
// Automated developing-story detection — repurposes the 72h duplicate
// signal above. Two independently-scraped items about the same real-world
// event within a short window is the strongest "this is developing"
// signal anywhere in this pipeline today; previously a duplicate match
// was just logged to rejected_items and discarded. is_key_point is always
// hard-coded false here (same safety property as the existing thread-match
// branch below) so automation can never trigger an auto-tweet by itself.
// Going live (is_live=true) additionally requires a 3rd independent
// source to confirm — see maybePromoteThread().
// ═══════════════════════════════════════════════════════════════════
function generateThreadSlugBase(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 80);
}

async function generateUniqueThreadSlug(supabase: any, title: string): Promise<string> {
  const base = generateThreadSlugBase(title) || "story";
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase.from("story_threads").select("id").eq("thread_slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${Date.now().toString(36)}${attempt > 0 ? `-${attempt}` : ""}`;
  }
  return `${base}-${Date.now()}`;
}

async function logThreadUpdateAudit(
  supabase: any,
  runId: string,
  dupeItem: { source_name?: string; original_headline?: string; headline?: string; original_summary?: string; summary?: string; source_url?: string },
  dupeTitle: string,
  threadId: string,
) {
  await supabase.from("newsroom_articles").insert({
    run_id: runId,
    source_name: dupeItem.source_name || "Unknown",
    original_headline: dupeTitle || "Untitled",
    original_summary: dupeItem.original_summary || dupeItem.summary || "",
    source_url: dupeItem.source_url || null,
    processing_status: "thread_update",
    matched_thread_id: threadId,
  });
}

async function maybePromoteThread(supabase: any, threadId: string) {
  const { count } = await supabase
    .from("thread_updates")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId);

  if ((count ?? 0) < 3) return;

  const { data: promoted } = await supabase
    .from("story_threads")
    .update({ is_live: true, live_started_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("created_by", "auto_pipeline")
    .eq("is_live", false)
    .is("live_ended_at", null)
    .select("id");

  if (promoted && promoted.length > 0) {
    console.log(`Auto-promoted thread ${threadId} to live after ${count} confirming sources`);
  }
}

async function appendThreadUpdate(
  supabase: any,
  runId: string,
  threadId: string,
  dupeItem: { source_name?: string; original_headline?: string; headline?: string; original_summary?: string; summary?: string; source_url?: string },
  dupeTitle: string,
) {
  const dupeSummary = dupeItem.original_summary || dupeItem.summary || "";
  const { error } = await supabase.from("thread_updates").insert({
    thread_id: threadId,
    title: dupeTitle || "Untitled",
    body: dupeSummary || dupeTitle || "Untitled",
    is_key_point: false,
    key_point_label: null,
    source_article_id: null,
  });
  if (error) {
    console.error("Auto thread_update insert failed:", error);
    return;
  }
  await logThreadUpdateAudit(supabase, runId, dupeItem, dupeTitle, threadId);
  await maybePromoteThread(supabase, threadId);
}

async function handleDeveloperStoryPromotion(
  supabase: any,
  matchedArticle: { id: string; title: string; thread_id?: string | null; created_at?: string },
  dupeItem: { source_name?: string; original_headline?: string; headline?: string; original_summary?: string; summary?: string; source_url?: string },
  runId: string,
  dupeTitle: string,
) {
  if (matchedArticle.thread_id) {
    await appendThreadUpdate(supabase, runId, matchedArticle.thread_id, dupeItem, dupeTitle);
    return;
  }

  // Thread-CREATION is scoped to a tighter 24h window than the 72h dedup
  // gate — a genuine developing story escalates fast; a 3-day-old title
  // coincidence is too weak a basis to spin up a new public-facing entity.
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const matchedArticleAge = matchedArticle.created_at ? new Date(matchedArticle.created_at).getTime() : 0;
  if (matchedArticleAge < twentyFourHoursAgo) {
    console.log(`Skipping thread auto-creation — matched article older than 24h (${matchedArticle.created_at})`);
    return;
  }

  // Re-check immediately before acting (cheap optimization for the common
  // sequential-loop case — this loop is not parallelized).
  const { data: freshArticle } = await supabase
    .from("articles")
    .select("id, thread_id, title, summary")
    .eq("id", matchedArticle.id)
    .single();

  if (freshArticle?.thread_id) {
    await appendThreadUpdate(supabase, runId, freshArticle.thread_id, dupeItem, dupeTitle);
    return;
  }

  const baseTitle = freshArticle?.title || matchedArticle.title;
  const slug = await generateUniqueThreadSlug(supabase, baseTitle);

  const { data: newThread, error: threadErr } = await supabase
    .from("story_threads")
    .insert({
      thread_slug: slug,
      title: baseTitle,
      summary: freshArticle?.summary || null,
      is_live: false,
      created_by: "auto_pipeline",
    })
    .select()
    .single();

  if (threadErr || !newThread) {
    console.error("Auto thread-create failed:", threadErr);
    return;
  }

  // The real atomicity guard: a conditional UPDATE ... WHERE thread_id IS NULL.
  // Postgres serializes concurrent updates on the same row, so only one
  // overlapping invocation of run-newsroom can ever win this claim — the
  // freshArticle re-check above is just a cheap optimization, not the guarantee.
  const { data: claimed } = await supabase
    .from("articles")
    .update({ thread_id: newThread.id })
    .eq("id", matchedArticle.id)
    .is("thread_id", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    // Lost the race — someone else claimed this article since our re-check.
    // Discard the thread we just created and log against whichever thread won.
    await supabase.from("story_threads").delete().eq("id", newThread.id);
    const { data: winner } = await supabase.from("articles").select("thread_id").eq("id", matchedArticle.id).single();
    if (winner?.thread_id) {
      await appendThreadUpdate(supabase, runId, winner.thread_id, dupeItem, dupeTitle);
    }
    return;
  }

  // Seed two updates so the thread never renders empty.
  await supabase.from("thread_updates").insert([
    {
      thread_id: newThread.id,
      title: baseTitle,
      body: freshArticle?.summary || baseTitle,
      is_key_point: false,
      key_point_label: null,
      source_article_id: matchedArticle.id,
    },
    {
      thread_id: newThread.id,
      title: dupeTitle || "Untitled",
      body: dupeItem.original_summary || dupeItem.summary || dupeTitle || "Untitled",
      is_key_point: false,
      key_point_label: null,
      source_article_id: null,
    },
  ]);

  await logThreadUpdateAudit(supabase, runId, dupeItem, dupeTitle, newThread.id);
  console.log(`Auto-created thread "${slug}" from article ${matchedArticle.id}`);
}

// ═══════════════════════════════════════════════════════════════════
// Crime-relevance classifier — batched Gemini call, defensive parsing.
// Rejected items go to public.rejected_items and never consume the
// article-generation budget below.
// ═══════════════════════════════════════════════════════════════════
async function classifyBatchInScope(
  items: Array<{ original_headline?: string; headline?: string; original_summary?: string; summary?: string }>,
  lovableApiKey: string,
): Promise<Array<{ in_scope: boolean; confidence: number; reason: string }>> {
  if (items.length === 0) return [];
  const payload = items.map((it, i) => ({
    i,
    headline: String(it.original_headline || it.headline || "").slice(0, 300),
    body: String(it.original_summary || it.summary || "").slice(0, 300),
  }));
  const user = `Classify whether each news item below is within scope for a crime and justice news site covering Ghana. IN SCOPE: crime, arrests, court cases, trials, sentencing, police and security services, prisons, fraud, corruption investigations, EOCO/OSP/NACOC actions, missing persons, road fatalities involving legal proceedings, public safety incidents, and crime policy or legislation. OUT OF SCOPE: entertainment, music, TV shows, talent competitions, sport, celebrity lifestyle, business stories with no criminal element, politics with no criminal element, and human-interest stories.

Respond with valid JSON only: a single array in the same order and length as the input, each element: {"i": number, "in_scope": true/false, "confidence": 0-100, "reason": "one short sentence"}.

Items:
${JSON.stringify(payload)}`;

  const doCall = async () => {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You classify news items for a Ghanaian crime and justice site. Return only valid JSON — no prose." },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) throw new Error(`classifier http ${r.status}`);
    const d = await r.json();
    const c = d.choices?.[0]?.message?.content || "[]";
    const m = c.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, c];
    const parsed = JSON.parse(m[1] || c);
    if (!Array.isArray(parsed)) throw new Error("classifier: not an array");
    return parsed;
  };

  let parsed: any[] = [];
  try {
    parsed = await doCall();
  } catch (e1) {
    console.error("Classifier attempt 1 failed:", e1);
    try {
      parsed = await doCall();
    } catch (e2) {
      console.error("Classifier attempt 2 failed — treating all as out of scope:", e2);
      return items.map(() => ({ in_scope: false, confidence: 0, reason: "classifier_error" }));
    }
  }

  const out = items.map(() => ({ in_scope: false, confidence: 0, reason: "no classification returned" }));
  for (const row of parsed) {
    const idx = typeof row?.i === "number" ? row.i : -1;
    if (idx >= 0 && idx < items.length) {
      out[idx] = {
        in_scope: !!row.in_scope,
        confidence: Math.max(0, Math.min(100, Number(row.confidence) || 0)),
        reason: String(row.reason || "").slice(0, 200),
      };
    }
  }
  return out;
}

// Strict crime-only keywords for RSS filtering
// Story MUST involve a criminal act, formal allegation, police/court action, seizure, or investigation
const CRIME_KEYWORDS = [
  // Criminal acts
  'arrest', 'arrested', 'murder', 'murdered', 'homicide', 'manslaughter',
  'robbery', 'robber', 'armed robbery', 'steal', 'stolen', 'theft', 'thief', 'burglary',
  'fraud', 'defraud', 'scam', 'scammer', 'forgery',
  'assault', 'assaulted', 'attack', 'stab', 'stabbed', 'shoot', 'shooting', 'shot',
  'rape', 'raped', 'defilement', 'defiled',
  'kidnap', 'kidnapped', 'kidnapping', 'abduction',
  'abuse', 'child abuse', 'domestic violence',
  'cybercrime', 'cyber fraud', 'hack', 'hacked', 'hacking',
  'drug seizure', 'drug bust', 'narcotic', 'cocaine', 'cannabis', 'tramadol',
  'money laundering', 'corruption charges', 'bribe', 'bribery',
  'human trafficking', 'trafficking',
  'arson', 'vandal', 'vandalism',
  'extortion', 'threat', 'threatening',
  'smuggle', 'smuggling', 'contraband',
  // Law enforcement & courts
  'police', 'suspect', 'accused', 'convict', 'convicted', 'sentence', 'sentenced',
  'court', 'judge', 'magistrate', 'bail', 'remand', 'remanded',
  'jail', 'prison', 'inmate', 'prisoner',
  'investigation', 'investigating', 'crime', 'criminal',
  'most wanted', 'manhunt', 'wanted',
  'seizure', 'confiscate', 'confiscated',
  'charge', 'charged', 'prosecution', 'prosecuted',
  'victim', 'perpetrator',
];

// No placeholder — articles without source images will have hero_image = null

// Extract image URL from an RSS item block
function extractRSSImage(block: string): string | null {
  // Try <media:content url="...">
  const mediaContent = block.match(/<media:content[^>]+url="([^"]+)"[^>]*\/?>/i)?.[1];
  if (mediaContent) return mediaContent;

  // Try <media:thumbnail url="...">
  const mediaThumbnail = block.match(/<media:thumbnail[^>]+url="([^"]+)"[^>]*\/?>/i)?.[1];
  if (mediaThumbnail) return mediaThumbnail;

  // Try <enclosure url="..." type="image/...">
  const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image\/[^"]*"[^>]*\/?>/i)?.[1];
  if (enclosure) return enclosure;

  // Try <image><url>...</url></image>
  const imageUrl = block.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>[\s\S]*?<\/image>/i)?.[1]?.trim();
  if (imageUrl) return imageUrl;

  // Try first <img src="..."> in description/content
  const imgSrc = block.match(/<img[^>]+src="([^"]+)"[^>]*\/?>/i)?.[1];
  if (imgSrc && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://'))) return imgSrc;

  return null;
}

// Parse RSS/Atom XML feed and extract items
function parseRSSItems(xml: string, sourceName: string): any[] {
  const items: any[] = [];
  
  // Try RSS <item> tags first, then Atom <entry> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  
  const matches = [...xml.matchAll(itemRegex), ...xml.matchAll(entryRegex)];
  
  for (const match of matches) {
    const block = match[1];
    
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const description = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim()
      || block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim()
      || "";
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim()
      || block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)?.[1]?.trim()
      || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      || block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
      || block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim()
      || "";
    
    // Strip HTML tags from description
    const cleanSummary = description.replace(/<[^>]*>/g, '').substring(0, 500);
    
    // Extract image from RSS item
    const imageUrl = extractRSSImage(block) || extractRSSImage(description);
    
    if (title) {
      items.push({
        source_name: sourceName,
        original_headline: title,
        original_summary: cleanSummary,
        source_url: link || null,
        pub_date: pubDate ? new Date(pubDate) : null,
        source_image_url: imageUrl,
      });
    }
  }
  
  return items;
}

// Fetch and parse a single RSS feed with timeout
async function fetchRSSFeed(source: { name: string; rss: string | null }): Promise<any[]> {
  if (!source.rss) return [];
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s per feed
    
    const response = await fetch(source.rss, {
      headers: { 'User-Agent': 'GhanaCrimes-Newsroom/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`RSS feed failed for ${source.name}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const items = parseRSSItems(xml, source.name);
    console.log(`RSS: ${source.name} returned ${items.length} items`);
    return items;
  } catch (e) {
    console.log(`RSS fetch error for ${source.name}: ${e instanceof Error ? e.message : 'unknown'}`);
    return [];
  }
}

// GATE 1: Filter RSS items to crime-related stories within the freshness window
// Rejects stale (>maxAgeHours), invalid (no/unparseable pubDate), or future-dated items.
function filterCrimeItems(items: any[], maxAgeHours: number): any[] {
  const now = Date.now();
  const cutoffMs = maxAgeHours * 60 * 60 * 1000;
  const futureLimitMs = 60 * 60 * 1000; // 1 hour in the future tolerated

  return items.filter(item => {
    // GATE 1A: Must have a valid pubDate
    if (!item.pub_date || isNaN(item.pub_date.getTime())) {
      console.log(`REJECTED_INVALID_PUBDATE: "${(item.original_headline || "").substring(0, 60)}"`);
      return false;
    }
    const ageMs = now - item.pub_date.getTime();
    // GATE 1B: Reject future-dated > 1 hour
    if (ageMs < -futureLimitMs) {
      console.log(`REJECTED_INVALID_PUBDATE (future): "${(item.original_headline || "").substring(0, 60)}"`);
      return false;
    }
    // GATE 1C: Reject stale (>3 hours by default)
    if (ageMs > cutoffMs) {
      const ageMinutes = Math.round(ageMs / 60000);
      console.log(`REJECTED_STALE: "${(item.original_headline || "").substring(0, 60)}" — ${ageMinutes} minutes old`);
      return false;
    }

    // Crime relevance keyword filter (crime-specialist sources still go through here;
    // upstream NEWS_SOURCES list controls which feeds are scanned).
    const text = `${item.original_headline} ${item.original_summary}`.toLowerCase();
    return CRIME_KEYWORDS.some(keyword => text.includes(keyword));
  });
}

// Valid categories that match the database CHECK constraint
const VALID_CATEGORIES = [
  "top-stories", "violent-crime", "property-crime", "cybercrime",
  "fraud-scams", "drug-offences", "domestic-violence", "traffic-offences",
  "youth-crime", "organised-crime", "white-collar-crime", "police-reports",
  "court-cases", "prison-news", "crime-prevention", "crime-statistics",
  "investigations", "most-wanted"
];

// Map AI-generated categories to valid ones
const CATEGORY_MAPPING: Record<string, string> = {
  "breaking-news": "top-stories",
  "theft-robbery": "property-crime",
  "drug-offenses": "drug-offences",
  "corruption": "white-collar-crime",
  "public-safety": "crime-prevention",
  "community-watch": "police-reports",
  "robbery": "property-crime",
  "murder": "violent-crime",
  "assault": "violent-crime",
  "fraud": "fraud-scams",
  "scams": "fraud-scams",
  "drugs": "drug-offences",
  "courts": "court-cases",
  "police": "police-reports",
};

// Helper to normalize category to valid one
function normalizeCategory(category: string): string {
  const normalized = category?.toLowerCase().trim() || "";
  if (VALID_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  if (CATEGORY_MAPPING[normalized]) {
    return CATEGORY_MAPPING[normalized];
  }
  // Default fallback
  return "top-stories";
}

// STRICT SOURCE-ONLY IMAGE POLICY
// The only hero_image allowed comes from the article's own source, via the
// shared extractor (RSS media / og:image / twitter:image / real in-body <img>).
// No AI generation, no web-search photo lookup, no placeholders, no fallbacks.
// If the source has no valid image, hero_image stays NULL.



// ═══════════════════════════════════════════════════════════════════
// LIVE FACT-CHECKING FILTER — verifies claims using real-time web search
// Catches errors like incorrect titles, wrong officeholders, outdated roles
// ═══════════════════════════════════════════════════════════════════
interface FactCheckResult {
  passed: boolean;
  corrections: Array<{
    original: string;
    corrected: string;
    field: string;
    reason: string;
  }>;
  corrected_article: any | null;
}

async function liveFactCheck(
  articleJson: any,
  lovableApiKey: string
): Promise<FactCheckResult> {
  const currentDateTime = new Date().toISOString();
  
  const factCheckPrompt = `You are a LIVE FACT-CHECKER for a Ghana crime news platform. The current date and time is ${currentDateTime}.

Your job is to verify ALL factual claims in this article using real-time web search. You must be especially vigilant about:

1. **CURRENT OFFICEHOLDERS & TITLES**: Verify that anyone mentioned holds the title/role stated AS OF RIGHT NOW (${currentDateTime}). Presidents, ministers, chiefs, commissioners, directors — their titles MUST reflect who currently holds office. If someone is referred to as "former" when they are actually the current officeholder, or vice versa, this is a CRITICAL error.

2. **NAMES & SPELLINGS**: Verify correct spelling of all names — people, places, institutions.

3. **DATES & TIMELINES**: Verify that dates mentioned are accurate and consistent.

4. **INSTITUTIONAL NAMES**: Verify official names of agencies, courts, police divisions, etc.

5. **LEGAL TERMINOLOGY**: Verify charges, legal processes, and court procedures are accurately described.

6. **GEOGRAPHIC ACCURACY**: Verify locations, regions, districts are correctly identified.

ARTICLE TO FACT-CHECK:

Headline: ${articleJson.headline}
Subtitle: ${articleJson.subtitle || ""}
Summary: ${articleJson.summary || ""}
Body: ${articleJson.body || ""}
Tweet: ${articleJson.twitter_post || ""}
Tags: ${JSON.stringify(articleJson.tags || [])}

INSTRUCTIONS:
- Search the web to verify EVERY factual claim, especially titles and roles of named individuals.
- For Ghana's President, Vice President, IGP, Attorney General, ministers — confirm who CURRENTLY holds each position as of today.
- If ANY factual error is found, provide the correction.
- If corrections are needed, return a FULLY CORRECTED version of the article with all fields.
- The corrected article must maintain the exact same structure and writing style.
- Do NOT change the writing style, tone, or structure — only fix factual errors.
- Do NOT add new information that wasn't in the original.
- Do NOT remove information unless it is factually wrong.

Return ONLY valid JSON:
{
  "passed": true/false,
  "corrections": [
    {
      "original": "exact text that is wrong",
      "corrected": "what it should be",
      "field": "which field (headline/body/summary/subtitle/twitter_post/tags)",
      "reason": "why this is wrong and source of correct info"
    }
  ],
  "corrected_article": null (if passed=true) OR { full corrected article with all original fields } (if passed=false)
}

If everything checks out, return: {"passed": true, "corrections": [], "corrected_article": null}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a rigorous, real-time fact-checker for a professional news organization. You verify every claim using live web search. You are especially strict about current officeholders, titles, and roles. Return only valid JSON." },
          { role: "user", content: factCheckPrompt }
        ],
        tools: [{ google_search: {} }],
      }),
    });

    if (!response.ok) {
      console.error(`Fact-check API failed: ${response.status}`);
      // On API failure, pass through but log warning
      return { passed: true, corrections: [], corrected_article: null };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const result = JSON.parse(jsonMatch[1] || content);
    
    if (!result.passed && result.corrections?.length > 0) {
      console.log(`FACT-CHECK FAILED — ${result.corrections.length} corrections needed:`);
      for (const c of result.corrections) {
        console.log(`  ❌ [${c.field}] "${c.original}" → "${c.corrected}" (${c.reason})`);
      }
    } else {
      console.log("FACT-CHECK PASSED — all claims verified");
    }
    
    return result;
  } catch (e) {
    console.error("Fact-check error:", e);
    // On error, pass through but log
    return { passed: true, corrections: [], corrected_article: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request. created_by references profiles(id), which
    // is a separate generated key from the auth user id (profiles.user_id is
    // the actual FK to auth.users) — must resolve through profiles or the
    // insert below violates newsroom_runs_created_by_fkey.
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        userId = profile?.id || null;
      }
    }

    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger_type || "manual";

    // Clean up stale "running" runs (older than 8 minutes) - they are timed-out ghosts
    const tenMinutesAgo = new Date(Date.now() - 8 * 60 * 1000).toISOString();
    await supabase.from("newsroom_runs").update({
      status: "failed",
      error_message: "Timed out — run did not complete within expected window",
      completed_at: new Date().toISOString(),
    }).eq("status", "running").lt("started_at", tenMinutesAgo);

    // Create a new run
    const { data: run, error: runError } = await supabase
      .from("newsroom_runs")
      .insert({
        trigger_type: triggerType,
        status: "running",
        articles_found: 0,
        articles_created: 0,
        created_by: userId,
      })
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create run: ${runError.message}`);
    }

    console.log(`Started newsroom run: ${run.id}`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1A: NATIVE RSS FEED SCANNING — real grounded news discovery
    // ═══════════════════════════════════════════════════════════════════
    const MAX_AGE_HOURS = 3; // FRESHNESS GUARDRAIL: 3-hour cutoff for crime news
    const today = new Date().toISOString().split('T')[0];
    
    console.log("Step 1A: Scanning RSS feeds from whitelisted sources...");
    
    // Fetch all RSS feeds in parallel
    const rssPromises = NEWS_SOURCES.map(source => fetchRSSFeed(source));
    const rssResults = await Promise.all(rssPromises);
    const allRssItems = rssResults.flat();
    
    console.log(`RSS total: ${allRssItems.length} raw items from ${NEWS_SOURCES.filter(s => s.rss).length} feeds`);
    
    // GATE 1: Filter to crime-related items within 3-hour window
    const freshCrimeItems = filterCrimeItems(allRssItems, MAX_AGE_HOURS);
    console.log(`RSS filtered: ${freshCrimeItems.length} crime items within ${MAX_AGE_HOURS}h window`);
    
    // Convert RSS items to standard format — preserve source_published_at for downstream gates
    const rssNewsItems = freshCrimeItems.map(item => ({
      source_name: item.source_name,
      original_headline: item.original_headline,
      original_summary: item.original_summary,
      source_url: item.source_url,
      source_image_url: item.source_image_url || null,
      source_published_at: item.pub_date ? item.pub_date.toISOString() : null,
      category_hint: "top-stories",
      estimated_date: item.pub_date ? item.pub_date.toISOString().split('T')[0] : today,
      discovery_method: "rss",
    }));

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1B: GEMINI SEARCH GROUNDING — supplementary AI web search
    // ═══════════════════════════════════════════════════════════════════
    console.log("Step 1B: Running Gemini search grounding for additional stories...");
    
    let geminiNewsItems: any[] = [];
    try {
      const sourcesList = NEWS_SOURCES.map(s => `${s.name} (${s.domain})`).join(", ");
      const searchPrompt = `You are the GhanaCrimes News Intake Filter.

You are scanning the following approved Ghanaian news outlets:
${sourcesList}

Today's date and time is ${new Date().toISOString()}. Only return news published within the last 20 hours.

CRITICAL GEOGRAPHIC RULE:
You must ONLY return crime news that takes place IN GHANA or directly involves Ghanaian citizens, Ghanaian institutions, or Ghanaian law enforcement.
Do NOT return any international crime news from the USA, UK, Nigeria, or any other country unless it directly involves a Ghanaian suspect, Ghanaian victim, or Ghanaian authorities.
If a story is about a crime in another country with no Ghana connection, discard it immediately.

Your job is to extract ONLY crime-related news FROM GHANA. You must IGNORE all stories that are:
Politics, Business, Sports, Entertainment, Opinion, Lifestyle, Education, Religion, Health (unless directly tied to a criminal investigation), Editorial commentary, Announcements, Feature stories, Human interest stories, International news without a direct Ghana connection.

Only extract stories involving:
Arrests, Court cases, Sentencing, Police investigations, Fraud, Scams, Robbery, Armed robbery, Murder, Attempted murder, Assault, Domestic violence, Child abuse, Defilement, Rape, Cybercrime, Drug seizures, Money laundering, Corruption charges, Human trafficking, Kidnapping, Prison news, Crime statistics, Security operations, Most wanted notices.

Filtering Rules:
- The crime must have occurred in Ghana OR directly involve Ghanaian nationals or institutions.
- The article must involve a criminal act or formal criminal allegation.
- There must be either: a named suspect, a police or court action, a filed charge, a sentencing decision, a seizure of illegal items, or an official criminal investigation.
- If the story does not involve a criminal offence or official criminal action, discard it.
- If the story is opinion or analysis about crime trends without a specific incident, discard it.
- If the story is purely political debate without charges filed, discard it.
- If the crime happened outside Ghana with no Ghanaian connection, discard it.
- If unsure, discard it.

Return only items that clearly meet BOTH the crime AND Ghana criteria.

Return a JSON array of 5-15 real crime news items. Each item must have:
- source_name: The news outlet name
- original_headline: The exact headline from the source
- original_summary: A brief 1-2 sentence summary of the story
- source_url: The actual URL where this story was published (must be a real URL you found)
- category_hint: One of: ${VALID_CATEGORIES.join(", ")}
- estimated_date: Publication date in YYYY-MM-DD format

Return ONLY a valid JSON array, no other text.`;

      // Add 15s timeout so Gemini search doesn't block the entire pipeline
      const geminiController = new AbortController();
      const geminiTimeout = setTimeout(() => geminiController.abort(), 15000);
      
      const searchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are a news wire service that finds and reports real, current news stories. You must search the web and return only verifiable news items with real URLs. Return only valid JSON." },
            { role: "user", content: searchPrompt }
          ],
          tools: [{ google_search: {} }],
        }),
        signal: geminiController.signal,
      });
      clearTimeout(geminiTimeout);

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const newsContent = searchData.choices?.[0]?.message?.content || "[]";
        
        try {
          const jsonMatch = newsContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, newsContent];
          const parsed = JSON.parse(jsonMatch[1] || newsContent);
          geminiNewsItems = (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
            ...item,
            discovery_method: "gemini_search",
          }));
        } catch (e) {
          console.error("Failed to parse Gemini search results:", e);
        }
        console.log(`Gemini search: found ${geminiNewsItems.length} items`);
      } else {
        const errText = await searchResponse.text();
        console.error(`Gemini search failed (${searchResponse.status}): ${errText}`);
        if (searchResponse.status === 429) {
          console.log("Rate limited on Gemini search, continuing with RSS results only");
        }
      }
    } catch (geminiError) {
      console.error("Gemini search error:", geminiError);
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1C: MERGE & DEDUPLICATE — combine RSS + Gemini results
    // ═══════════════════════════════════════════════════════════════════
    const allDiscoveredItems = [...rssNewsItems, ...geminiNewsItems];
    
    // Deduplicate by headline similarity
    const seenHeadlines = new Set<string>();
    const newsItems = allDiscoveredItems.filter(item => {
      const normalized = (item.original_headline || "").toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const keyPhrase = normalized.split(' ').slice(0, 6).join(' ');
      if (seenHeadlines.has(normalized) || (keyPhrase.length > 15 && seenHeadlines.has(keyPhrase))) {
        return false;
      }
      seenHeadlines.add(normalized);
      seenHeadlines.add(keyPhrase);
      return true;
    });
    
    console.log(`Merged: ${allDiscoveredItems.length} total → ${newsItems.length} unique items (${rssNewsItems.length} RSS + ${geminiNewsItems.length} Gemini)`);

    // Step 1.5: Filter out outdated stories based on keywords and strict 20-hour cutoff
    const outdatedKeywords = [
      'christmas eve', 'christmas day', 'christmas preparation', 'christmas preparedness',
      'holiday season preparation', 'yuletide', 'festive season', 'new year eve',
      'december 24', 'december 25', 'december 31', 'january 1st celebration'
    ];
    
    const twentyHoursAgo = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);
    
    const isOutdatedStory = (item: any): boolean => {
      const headline = (item.original_headline || item.headline || "").toLowerCase();
      const summary = (item.original_summary || item.summary || "").toLowerCase();
      const combined = `${headline} ${summary}`;
      
      // Check for outdated keywords
      for (const keyword of outdatedKeywords) {
        if (combined.includes(keyword)) {
          console.log(`Filtering outdated story (keyword: ${keyword}): ${headline}`);
          return true;
        }
      }
      
      return false;
    };
    
    // Filter out outdated stories
    let currentNewsItems = newsItems.filter(item => !isOutdatedStory(item));
    const outdatedSkipped = newsItems.length - currentNewsItems.length;
    if (outdatedSkipped > 0) {
      console.log(`Filtered ${outdatedSkipped} outdated stories`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // GATE: CRIME-RELEVANCE CLASSIFIER (before AI article generation)
    // Rejected items log to public.rejected_items and never consume the
    // article-generation budget below.
    // ═══════════════════════════════════════════════════════════════════
    if (currentNewsItems.length > 0) {
      const classifications = await classifyBatchInScope(currentNewsItems, lovableApiKey);
      const kept: any[] = [];
      const rejectedRows: any[] = [];
      for (let i = 0; i < currentNewsItems.length; i++) {
        const item = currentNewsItems[i];
        const c = classifications[i] || { in_scope: false, confidence: 0, reason: "no classification returned" };
        if (c.in_scope && c.confidence >= 70) {
          kept.push(item);
        } else {
          const reason = c.reason === "classifier_error" ? "classifier_error" : "out_of_scope";
          rejectedRows.push({
            source: item.source_name || null,
            original_headline: item.original_headline || item.headline || "Untitled",
            original_url: item.source_url || null,
            reason,
            confidence: c.confidence,
            detail: c.reason,
          });
          console.log(`SCOPE_REJECT (${c.confidence}) ${c.reason}: ${(item.original_headline || "").substring(0, 80)}`);
        }
      }
      if (rejectedRows.length > 0) {
        await supabase.from("rejected_items").insert(rejectedRows);
      }
      console.log(`Scope gate: ${kept.length} in scope, ${rejectedRows.length} rejected`);
      currentNewsItems = kept;
    }

    // ═══════════════════════════════════════════════════════════════════
    // GATE: TIGHTENED DUPLICATE CHECK (72h, title similarity ≥ 0.55 OR same source URL)
    // Rejected items log to public.rejected_items with reason "duplicate".
    // ═══════════════════════════════════════════════════════════════════
    if (currentNewsItems.length > 0) {
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data: recentTitles } = await supabase
        .from("articles")
        .select("id, title, source_url, thread_id, created_at")
        .gte("created_at", seventyTwoHoursAgo);
      const { data: recentQueued } = await supabase
        .from("newsroom_articles")
        .select("original_headline, source_url")
        .gte("created_at", seventyTwoHoursAgo)
        .in("processing_status", ["pending", "processing", "completed"]);

      // recentQueued rows have no real article id/thread_id yet, so a match
      // against one of those can never create or feed a thread — only a
      // match against a real `articles` row (article: true) is eligible.
      const recent: Array<{ title: string; source_url: string | null; article: boolean; id?: string; thread_id?: string | null; created_at?: string }> = [
        ...(recentTitles || []).map((r: any) => ({ title: r.title, source_url: r.source_url, article: true, id: r.id, thread_id: r.thread_id, created_at: r.created_at })),
        ...(recentQueued || []).map((r: any) => ({ title: r.original_headline, source_url: r.source_url, article: false })),
      ];
      const urlSet = new Set(recent.map(r => (r.source_url || "").trim().toLowerCase()).filter(Boolean));

      const kept: any[] = [];
      const dupeRows: any[] = [];
      for (const item of currentNewsItems) {
        const url = (item.source_url || "").trim().toLowerCase();
        const title = item.original_headline || item.headline || "";
        let matched = false;
        let matchReason = "";
        let matchedArticle: { id: string; title: string; thread_id?: string | null; created_at?: string } | null = null;
        if (url && urlSet.has(url)) {
          matched = true;
          matchReason = "same source URL";
        } else {
          for (const r of recent) {
            if (titleSimilarity(title, r.title) >= 0.55) {
              matched = true;
              matchReason = `title sim ≥0.55 vs "${r.title.substring(0, 60)}"`;
              if (r.article && r.id) matchedArticle = { id: r.id, title: r.title, thread_id: r.thread_id, created_at: r.created_at };
              break;
            }
          }
        }
        if (matched) {
          dupeRows.push({
            source: item.source_name || null,
            original_headline: title || "Untitled",
            original_url: item.source_url || null,
            reason: "duplicate",
            detail: matchReason,
          });
          console.log(`DUP_REJECT (${matchReason}): ${title.substring(0, 80)}`);
          if (matchedArticle) {
            await handleDeveloperStoryPromotion(supabase, matchedArticle, item, run.id, title);
          }
        } else {
          kept.push(item);
          // Add to in-run set to catch duplicates within the same batch
          if (url) urlSet.add(url);
          recent.push({ title, source_url: item.source_url || null, article: false });
        }
      }
      if (dupeRows.length > 0) {
        await supabase.from("rejected_items").insert(dupeRows);
      }
      console.log(`72h dedup gate: ${kept.length} unique, ${dupeRows.length} duplicates`);
      currentNewsItems = kept;
    }

    if (currentNewsItems.length === 0) {
      await supabase.from("newsroom_runs").update({
        status: "no_news",
        error_message: newsItems.length > 0 ? `All ${newsItems.length} stories were filtered as outdated` : null,
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);

      return new Response(JSON.stringify({ 
        success: true,
        run_id: run.id,
        message: "No news items found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Check for duplicates BEFORE inserting (saves AI calls)
    // Get recent articles to check against (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentArticles } = await supabase
      .from("articles")
      .select("id, title, article_slug")
      .gte("created_at", sevenDaysAgo);

    // Also check recent newsroom articles to avoid processing same headline twice
    const { data: recentNewsroomArticles } = await supabase
      .from("newsroom_articles")
      .select("original_headline")
      .gte("created_at", sevenDaysAgo)
      .neq("processing_status", "failed");

    // Active developing-story threads — used below to auto-detect follow-ups
    // to an already-live thread instead of publishing an unrelated standalone
    // article. Fetched once per run (small table, no windowing needed).
    const { data: activeThreads } = await supabase
      .from("story_threads")
      .select("id, thread_slug, title, summary")
      .eq("is_live", true);
    const activeThreadsBySlug = new Map<string, any>((activeThreads || []).map((t: any) => [t.thread_slug, t]));

    // Build sets for fast lookup
    const existingHeadlines = new Set<string>();
    const existingSlugs = new Set<string>();
    
    for (const article of recentArticles || []) {
      // Normalize title for comparison (lowercase, remove special chars)
      const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      existingHeadlines.add(normalizedTitle);
      
      // Also add key phrases (first 5-6 words)
      const keyPhrase = normalizedTitle.split(' ').slice(0, 6).join(' ');
      if (keyPhrase.length > 20) {
        existingHeadlines.add(keyPhrase);
      }
      
      // Track slugs
      if (article.article_slug) {
        existingSlugs.add(article.article_slug.toLowerCase());
      }
    }

    // Add newsroom headlines already processed
    for (const nrArticle of recentNewsroomArticles || []) {
      const normalizedHeadline = nrArticle.original_headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      existingHeadlines.add(normalizedHeadline);
    }

    // Helper function to check if headline is duplicate
    const isDuplicateHeadline = (headline: string): boolean => {
      const normalized = headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      
      // Exact match
      if (existingHeadlines.has(normalized)) return true;
      
      // Key phrase match (first 6 words)
      const keyPhrase = normalized.split(' ').slice(0, 6).join(' ');
      if (keyPhrase.length > 20 && existingHeadlines.has(keyPhrase)) return true;
      
      // Fuzzy match - check if >70% of words overlap with any existing headline
      const words = new Set(normalized.split(' ').filter(w => w.length > 3));
      for (const existing of existingHeadlines) {
        const existingWords = new Set(existing.split(' ').filter(w => w.length > 3));
        if (existingWords.size < 4) continue;
        
        let matches = 0;
        for (const word of words) {
          if (existingWords.has(word)) matches++;
        }
        
        const overlapRatio = matches / Math.max(words.size, existingWords.size);
        if (overlapRatio > 0.7) return true;
      }
      
      return false;
    };

    // Filter out duplicates BEFORE making AI calls (use currentNewsItems which already filters outdated)
    const uniqueNewsItems = currentNewsItems.filter(item => {
      const headline = item.original_headline || item.headline || "";
      return !isDuplicateHeadline(headline);
    });

    const skippedDuplicates = currentNewsItems.length - uniqueNewsItems.length;
    console.log(`Duplicate check: ${skippedDuplicates} duplicates skipped, ${uniqueNewsItems.length} unique items to process`);

    // Also track outdated items for the record
    const outdatedRecords = newsItems
      .filter(item => isOutdatedStory(item))
      .map(item => ({
        run_id: run.id,
        source_name: item.source_name || "Unknown",
        original_headline: item.original_headline || item.headline || "Untitled",
        original_summary: item.original_summary || item.summary || "",
        source_url: item.source_url || null,
        processing_status: "outdated",
      }));

    // Insert only unique news items as pending — persist source_published_at
    const newsRecords = uniqueNewsItems.map(item => ({
      run_id: run.id,
      source_name: item.source_name || "Unknown",
      original_headline: item.original_headline || item.headline || "Untitled",
      original_summary: item.original_summary || item.summary || "",
      source_url: item.source_url || null,
      image_style: item.source_image_url || null,
      source_published_at: item.source_published_at || null,
      processing_status: "pending",
    }));

    // Also insert skipped duplicates with status (from current/non-outdated items only)
    const duplicateRecords = currentNewsItems
      .filter(item => isDuplicateHeadline(item.original_headline || item.headline || ""))
      .map(item => ({
        run_id: run.id,
        source_name: item.source_name || "Unknown",
        original_headline: item.original_headline || item.headline || "Untitled",
        original_summary: item.original_summary || item.summary || "",
        source_url: item.source_url || null,
        processing_status: "duplicate",
      }));

    // Insert all records (pending, duplicate, and outdated)
    const { data: insertedNews, error: insertError } = await supabase
      .from("newsroom_articles")
      .insert([...newsRecords, ...duplicateRecords, ...outdatedRecords])
      .select();

    if (insertError) {
      console.error("Failed to insert news items:", insertError);
    }

    // Update articles found count
    await supabase.from("newsroom_runs").update({
      articles_found: newsItems.length,
    }).eq("id", run.id);

    // Step 3: Process pending items — include carry-over from previous timed-out runs
    let articlesCreated = 0;
    const STALE_CUTOFF_MS = MAX_AGE_HOURS * 60 * 60 * 1000;
    const isStale = (item: any) => {
      const dateToCheck = item.source_published_at || item.created_at;
      if (!dateToCheck) return false;
      const ageMs = Date.now() - new Date(dateToCheck).getTime();
      return ageMs > STALE_CUTOFF_MS;
    };

    const newPendingItems = (insertedNews || []).filter(item => item.processing_status === "pending");

    // Also fetch leftover pending items from previous runs that timed out
    const { data: carryOverRaw } = await supabase
      .from("newsroom_articles")
      .select("*")
      .eq("processing_status", "pending")
      .not("run_id", "eq", run.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // GATE 4: Reject pending queue items whose source is now > 3 hours old
    const staleCarryOver = (carryOverRaw || []).filter(isStale);
    if (staleCarryOver.length > 0) {
      console.log(`GATE 4: Rejecting ${staleCarryOver.length} stale pending queue items`);
      await supabase
        .from("newsroom_articles")
        .update({ processing_status: "rejected", error_message: "STALE_IN_PENDING_QUEUE" })
        .in("id", staleCarryOver.map(i => i.id));
    }
    const carryOverItems = (carryOverRaw || []).filter(item => !isStale(item));

    // Prefer stories with a real source image so the homepage is not dominated by image-less articles.
    // Then process newer items first to avoid stale no-image carry-over blocking fresh RSS stories.
    const MAX_ARTICLES_PER_RUN = 8;
    const pendingItems = [...newPendingItems, ...carryOverItems]
      .sort((a, b) => {
        const aHasImage = !!a.image_style;
        const bHasImage = !!b.image_style;
        if (aHasImage !== bHasImage) return aHasImage ? -1 : 1;
        const aTime = new Date(a.source_published_at || a.created_at || 0).getTime();
        const bTime = new Date(b.source_published_at || b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, MAX_ARTICLES_PER_RUN);
    console.log(`Processing ${pendingItems.length} pending items (capped at ${MAX_ARTICLES_PER_RUN}) from ${carryOverItems.length} carry-over + ${newPendingItems.length} new`);

    for (const newsItem of pendingItems) {
      try {
        // GATE 2: Re-check freshness immediately before AI processing
        if (isStale(newsItem)) {
          console.log(`GATE 2 STALE_BEFORE_AI: skipping "${newsItem.original_headline?.substring(0, 60)}"`);
          await supabase.from("newsroom_articles").update({
            processing_status: "rejected",
            error_message: "STALE_BEFORE_AI",
          }).eq("id", newsItem.id);
          continue;
        }

        // Update status to processing
        await supabase.from("newsroom_articles").update({
          processing_status: "processing",
        }).eq("id", newsItem.id);

        // Build list of recently published slugs for duplicate suppression by AI
        const recentSlugsList = Array.from(existingSlugs).slice(0, 50).join(", ");

        // Cheap pre-filter against active developing-story threads (Dice-bigram
        // similarity, generous threshold — false positives just cost a few
        // prompt tokens; false negatives fall back to today's unchanged
        // behavior). The AI makes the real match decision below.
        const headlineForMatch = newsItem.original_headline || "";
        const candidateThreads = (activeThreads || [])
          .map((t: any) => ({
            ...t,
            score: Math.max(
              titleSimilarity(headlineForMatch, t.title),
              titleSimilarity(headlineForMatch, t.summary || ""),
            ),
          }))
          .filter((t: any) => t.score >= 0.15)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 5);

        const activeThreadsBlock = candidateThreads.length > 0
          ? `\nACTIVE DEVELOPING STORY THREADS (only shown if potentially relevant):\n${candidateThreads.map((t: any) => `${t.thread_slug}: ${t.title}`).join("\n")}\n\nIf this scanned item is clearly a follow-up development in one of the threads listed above (same ongoing case, same suspects/incident, a new development such as an arrest, court appearance, sentencing, or new detail in an already-covered story), set matched_thread_slug to that thread's slug exactly as shown above. Otherwise set matched_thread_slug to null. Do not guess — only match if you are confident this is the same real-world case/incident, not merely a similar crime type.\n\nIf matched_thread_slug is not null, also decide is_minor_update:\n- true: this is a short incremental development (e.g. a bail ruling, a new arrest in the same case, a court adjournment, an updated charge) that is not significant enough to justify a new full standalone article of its own, and would be better presented as a short update to the existing live coverage.\n- false: this is a major development (e.g. a verdict, a new major charge, a significant new suspect, a materially newsworthy escalation) substantial enough to warrant its own full article, IN ADDITION to being logged against the existing thread.\nIf matched_thread_slug is null, set is_minor_update to false.\n`
          : "";

        // Generate full article using the GhanaCrimes Automated Newsroom Engine
        const articlePrompt = `You are running a GhanaCrimes automated newsroom cycle.

TODAY'S DATE IS ${today}

You will receive ONE scanned item to process.

SCANNED ITEM:
headline: ${newsItem.original_headline}
summary: ${newsItem.original_summary}
source: ${newsItem.source_name}
published_date: ${today}
url: ${newsItem.source_url || "unknown"}

PREVIOUSLY PUBLISHED SLUGS (last 7 days):
${recentSlugsList || "none"}
${activeThreadsBlock}
---

SOURCE HANDLING RULE

You may use the scanned outlets internally for verification.
You must NEVER mention any media outlet name inside the headline, subtitle, summary, body, seo_description, twitter_post, or photo_description.

Instead, attribute information only to:
Police statement, Court filing, Prosecutor, Fire Service spokesperson, Ghana Police Service, Judicial Service, National Fire Service, Named official, Witness.

If the only available source is a media report and no official source is available, write neutrally without naming the outlet.
Never write phrases such as "According to MyJoyOnline", "Citi Newsroom reported", or "Graphic Online stated".
Never promote competitors.

---

DUPLICATE SUPPRESSION

The system stores previously published slugs listed above.
If this event matches a previously published slug or is clearly the same incident already covered within the last 48 hours, return:

headline = DUPLICATE_SKIP
All other fields empty.

---

GEOGRAPHIC RULE

This is a GHANA-ONLY crime news platform. The story MUST take place in Ghana or directly involve Ghanaian citizens, Ghanaian institutions, or Ghanaian law enforcement.
If the crime occurred in another country (USA, UK, Nigeria, etc.) with no direct Ghana connection, return:

headline = NON_GHANA_SKIP
All other fields empty.

---

FRESHNESS RULE

If the event is more than 30 days old based on verified publication dates, return:

headline = OUTDATED_SKIP
All other fields empty.

Never update old stories to appear recent.

---

VERIFICATION RULE

Confirm key facts using credible sources where possible.
Prefer official or primary sources such as police statements, court filings, or named officials.
If only one media source exists and no official confirmation is available, write the facts plainly without naming the outlet.
If a detail appears in only one source, clearly attribute it.
If details conflict, report both versions and attribute each.
Never invent names, numbers, dates, or quotes.
Publish even with a single source — do not reject stories for lack of multi-source verification.

---

WRITING RULES

Use short sentences.
Use common everyday words.
Remain neutral.
Do not dramatise.
Do not speculate.
Do not repeat the same fact twice.
Do not hedge excessively.
Do not use filler language.
Respect presumption of innocence.

If details such as exact cause or damage are unknown, state once plainly. For example:
"The cause of the fire is under investigation."

Do not write phrases like "Reports indicate", "Information was not immediately available", or "Efforts are ongoing".

The reading level must be understandable by a 10 year old.
The tone must be calm, precise, and authoritative, like a professional wire service.

---

OUTPUT FIELDS

headline
Short and factual. Max 80 characters. No colons or long dashes.

subtitle
One clear sentence expanding the headline.

summary
Plain English. Max 500 characters.

body
6 to 10 HTML paragraphs using <p> tags.
Each paragraph 2 to 4 short sentences.
Must include source attribution inside paragraphs using official sources only.
Explain clearly: What happened, Where, When, Who was involved, What authorities said, What legal action follows, Why it matters.
Never use colons, long dashes, bullet points, emojis, hashtags, or URLs inside the body.

seo_description
Max 155 characters.

slug
Lowercase with hyphens.

section
Choose from: ${VALID_CATEGORIES.join(", ")}.

tags
Array including location, agency, crime type, key individuals.

twitter_post
A short reported news sentence written in normal English. Maximum 150 characters. Must end with a period.
Must read like a journalist reporting the news, NOT a headline.
Use sentence case (only capitalize first word, proper nouns, acronyms, and place names).
Every tweet must have a clear subject and verb. Use forms like:
- "Police have arrested..."
- "A court has remanded..."
- "Authorities have seized..."
- "A suspect has been charged..."
Use active voice. No hashtags. No emojis. No links. No ellipsis. No long dashes.
Good examples:
- "Police have arrested five suspects in a galamsey crackdown in the Ashanti Region."
- "An 18-year-old has appeared in Adabraka court over a security guard assault."
- "A court has charged three people over an armed robbery case in Kumasi."
Bad examples (DO NOT generate these):
- "Police Arrest 5 Suspects In Galamsey Crackdown In Ashanti."
- "18-Year-Old Appears In Adabraka Court Over Security Guard Assault."
- "Court Charges 3 Over Armed Robbery Case In Kumasi."
If it exceeds 150 characters, rewrite shorter until it fits. Must not end with truncation.

photo_description
Describe a real world photograph. Maximum 50 words. No faces described. No illustrations.

matched_thread_slug
The slug of the matched active thread from the list above, or null if none matches.

is_minor_update
true or false. Only meaningful when matched_thread_slug is not null (see rules above). Otherwise false.

---

Return ONLY valid JSON with exactly these keys:

{
  "headline": "...",
  "subtitle": "...",
  "summary": "...",
  "body": "<p>...</p>",
  "seo_description": "...",
  "slug": "...",
  "section": "...",
  "tags": ["tag1", "tag2"],
  "twitter_post": "...",
  "photo_description": "...",
  "matched_thread_slug": null,
  "is_minor_update": false
}`;

        const articleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are the GhanaCrimes Automated Newsroom Engine. You are a senior investigative crime editor. You write in clear, simple English that a 10 year old can understand, while maintaining professional newsroom standards. You do not mention or promote other media outlets. You do not narrate your verification process. You do not hedge excessively. You do not repeat facts. You do not use filler language. Return only valid JSON. Never use colons, long dashes, bullet points, emojis, hashtags, URLs, or media outlet names." },
              { role: "user", content: articlePrompt }
            ],
          }),
        });

        if (!articleResponse.ok) {
          throw new Error(`Article generation failed: ${articleResponse.status}`);
        }

        const articleData = await articleResponse.json();
        const articleContent = articleData.choices?.[0]?.message?.content || "{}";

        let articleJson: any;
        try {
          const jsonMatch = articleContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, articleContent];
          articleJson = JSON.parse(jsonMatch[1] || articleContent);
        } catch (e) {
          throw new Error("Failed to parse article JSON");
        }

        // Skip flags from AI verification — INSUFFICIENT_VERIFICATION no longer blocks publishing
        const skipFlag = articleJson.headline;
        if (skipFlag === "OUTDATED_SKIP" || skipFlag === "DUPLICATE_SKIP" || skipFlag === "NON_GHANA_SKIP") {
          const statusMap: Record<string, string> = {
            "OUTDATED_SKIP": "outdated",
            "DUPLICATE_SKIP": "duplicate",
            "NON_GHANA_SKIP": "rejected",
          };
          const reasonMap: Record<string, string> = {
            "OUTDATED_SKIP": "AI verification determined this story is outdated",
            "DUPLICATE_SKIP": "AI verification determined this is a duplicate of a recently published story",
            "NON_GHANA_SKIP": "Story is not related to Ghana — international news rejected",
          };
          console.log(`AI flagged story as ${skipFlag}, skipping: ${newsItem.original_headline}`);
          await supabase.from("newsroom_articles").update({
            processing_status: statusMap[skipFlag],
            error_message: reasonMap[skipFlag],
          }).eq("id", newsItem.id);
          continue;
        }

        // FACT-CHECK SKIPPED for speed — articles must publish within 10 minutes
        // Fact-checking was adding ~15s latency per article, causing timeout backlogs
        console.log(`Skipping fact-check for speed: ${articleJson.headline}`);

        // Thread-match validation — never trust the AI's returned slug blindly.
        // If it doesn't resolve to a real active thread (hallucination or a
        // stale candidate list), treat as no match and fall through unchanged.
        const rawMatchedSlug = typeof articleJson.matched_thread_slug === "string" ? articleJson.matched_thread_slug : null;
        const matchedThread = rawMatchedSlug ? activeThreadsBySlug.get(rawMatchedSlug) : null;
        const isMinorUpdate = matchedThread ? !!articleJson.is_minor_update : false;
        if (matchedThread) {
          console.log(`Thread match: "${newsItem.original_headline?.substring(0, 60)}" -> ${matchedThread.thread_slug} (minor_update=${isMinorUpdate})`);
        }

        // Case A: matched an active thread AND it's only a minor development —
        // skip full article generation (no slug, no image extraction, no
        // extract-cities/auto-tweet) and log it directly as a thread update
        // instead. is_key_point is always hard-coded false for automated
        // writes — this can never trigger an auto-tweet (auto-tweet/index.ts
        // rejects non-key-point thread_update_id calls, and this code path
        // never calls auto-tweet for thread updates anyway).
        if (matchedThread && isMinorUpdate) {
          if (isStale(newsItem)) {
            console.log(`GATE 3 STALE_BEFORE_PUBLISH: skipping "${newsItem.original_headline?.substring(0, 60)}"`);
            await supabase.from("newsroom_articles").update({
              processing_status: "rejected",
              error_message: "STALE_BEFORE_PUBLISH",
            }).eq("id", newsItem.id);
            continue;
          }

          const { error: threadUpdateError } = await supabase.from("thread_updates").insert({
            thread_id: matchedThread.id,
            title: articleJson.headline,
            body: articleJson.summary,
            is_key_point: false,
            key_point_label: null,
            source_article_id: null,
          });

          if (threadUpdateError) {
            throw new Error(`Failed to save thread update: ${threadUpdateError.message}`);
          }

          await supabase.from("newsroom_articles").update({
            processing_status: "thread_update",
            matched_thread_id: matchedThread.id,
          }).eq("id", newsItem.id);

          console.log(`Logged minor update to thread ${matchedThread.thread_slug}: ${articleJson.headline}`);
          continue;
        }

        // Use AI-generated slug or create from headline
        const slugBase = (articleJson.slug || articleJson.headline || "article")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 80);

        const articleSlug = `${slugBase}-${Date.now()}`;

        // SOURCE IMAGE EXTRACTION — shared waterfall (RSS → source URL og:image),
        // validates and re-hosts to storage. Never blocks publishing on failure.
        let heroImageUrl: string | null = null;
        let imageSourceType: string = 'none';
        try {
          const { extractHeroImage } = await import("../_shared/extract-image.ts");
          const rssImg = newsItem.image_style || null;
          const result = await extractHeroImage(
            {
              articleUrl: newsItem.source_url || null,
              extraUrls: rssImg ? [rssImg] : [],
              base: newsItem.source_url || null,
            },
            articleSlug,
            supabase,
          );
          heroImageUrl = result.url;
          imageSourceType = result.source;
          if (heroImageUrl) console.log(`Hero image (${imageSourceType}): ${heroImageUrl}`);
          else console.log("No source image found in waterfall");
        } catch (imgErr) {
          console.error("Hero extraction error (non-blocking):", imgErr);
        }

        // Update newsroom article with image source type
        await supabase.from("newsroom_articles").update({
          image_style: imageSourceType,
        }).eq("id", newsItem.id);

        // GATE 3: Final freshness check before database insert
        if (isStale(newsItem)) {
          console.log(`GATE 3 STALE_BEFORE_PUBLISH: skipping "${newsItem.original_headline?.substring(0, 60)}"`);
          await supabase.from("newsroom_articles").update({
            processing_status: "rejected",
            error_message: "STALE_BEFORE_PUBLISH",
          }).eq("id", newsItem.id);
          continue;
        }

        // Insert the article and auto-publish — persist source_published_at
        const { data: newArticle, error: articleError } = await supabase
          .from("articles")
          .insert({
            title: articleJson.headline,
            subtitle: articleJson.subtitle,
            summary: articleJson.summary,
            body: articleJson.body,
            article_slug: articleSlug,
            category_slug: normalizeCategory(articleJson.section),
            author_name: "GhanaCrimes Newsroom",
            tags: articleJson.tags || [],
            seo_title: articleJson.headline,
            seo_description: articleJson.seo_description,
            hero_image: heroImageUrl,
            source_url: newsItem.source_url || null,
            twitter_post: articleJson.twitter_post || null,
            is_published: true,
            published_at: new Date().toISOString(),
            source_published_at: newsItem.source_published_at || null,
            thread_id: matchedThread ? matchedThread.id : null,
          })
          .select()
          .single();

        if (articleError) {
          throw new Error(`Failed to save article: ${articleError.message}`);
        }

        // Update newsroom article with success
        await supabase.from("newsroom_articles").update({
          processing_status: "completed",
          generated_article_id: newArticle.id,
          matched_thread_id: matchedThread ? matchedThread.id : null,
        }).eq("id", newsItem.id);

        // Extract cities and update crime type stats from the article for the crime dashboard
        try {
          const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-cities`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              article_id: newArticle.id,
              title: newArticle.title,
              body: newArticle.body,
              category_slug: newArticle.category_slug,
            }),
          });
          
          if (extractResponse.ok) {
            const extractResult = await extractResponse.json();
            console.log(`Extracted ${extractResult.cities_found} cities from article`);
          }
        } catch (extractError) {
          console.error("City extraction failed:", extractError);
        }

        // Auto-tweet the newly published article
        try {
          const tweetResponse = await fetch(`${supabaseUrl}/functions/v1/auto-tweet`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ article_id: newArticle.id }),
          });
          
          if (tweetResponse.ok) {
            const tweetResult = await tweetResponse.json();
            console.log(`Auto-tweeted article: ${tweetResult.tweet_id || 'success'}`);
          } else {
            const tweetErr = await tweetResponse.text();
            console.error("Auto-tweet failed:", tweetErr);
          }
        } catch (tweetError) {
          console.error("Auto-tweet error:", tweetError);
        }

        // Case B companion log: this article is a major development in an
        // active thread — link it into the live coverage timeline too.
        // Non-blocking: never fails the already-successful article publish.
        // is_key_point is always hard-coded false, same safety property as
        // Case A — this can never trigger an auto-tweet.
        if (matchedThread) {
          try {
            await supabase.from("thread_updates").insert({
              thread_id: matchedThread.id,
              title: newArticle.title,
              body: newArticle.summary,
              is_key_point: false,
              key_point_label: null,
              source_article_id: newArticle.id,
            });
            console.log(`Logged major development to thread ${matchedThread.thread_slug}: ${newArticle.title}`);
          } catch (threadLogError) {
            console.error("Thread update companion log failed (non-blocking):", threadLogError);
          }
        }

        articlesCreated++;
        // Update counter incrementally so it persists even if function times out
        await supabase.from("newsroom_runs").update({
          articles_created: articlesCreated,
        }).eq("id", run.id);
        console.log(`Created article ${articlesCreated}: ${newArticle.title}`);

      } catch (error) {
        console.error(`Error processing news item ${newsItem.id}:`, error);
        await supabase.from("newsroom_articles").update({
          processing_status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        }).eq("id", newsItem.id);
      }
    }

    // Update run as completed
    await supabase.from("newsroom_runs").update({
      status: "completed",
      articles_created: articlesCreated,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      articles_found: newsItems.length,
      articles_created: articlesCreated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Newsroom error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
