// Source-grounded ingestion: poll verified feeds, dedupe, gate, draft an original
// attributed summary, and auto-publish only items that pass every check.
// Auth: x-cron-secret header (vault secret) OR a staff user's JWT (manual run).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { AiCreditError, callGateway, newUsage, parseJson } from "../_shared/ai-usage.ts";
import { detectRegion, runGate, stripEditorialFiller, stripHtml, wordCount, type Analysis } from "../_shared/editorial-gate.ts";
import { extractHeroImage } from "../_shared/extract-image.ts";

const UA = "GhanaCrimesBot/1.0 (+https://www.ghanacrimes.com/about)";
const MAX_AI_ITEMS = 12;
const MAX_ITEM_AGE_H = 48;
const FIRST_POLL_MAX_AGE_H = 168;
const SUMMARY_CHARS = 280;

// Incident types used by the same-incident guard (place + incident within 48h = one story).
const INCIDENT_TYPES: [string, RegExp][] = [
  ["fire", /\b(fire|blaze|inferno|gutted|guts)\b/i], ["robbery", /\brobber\w*|robbed\b/i],
  ["murder", /\b(murder\w*|killed|stabbed|shot dead|homicide)\b/i], ["crash", /\b(crash\w*|accident|collision)\b/i],
  ["mob", /\b(mob|lynch\w*)\b/i], ["kidnap", /\b(kidnap\w*|abduct\w*)\b/i], ["flood", /\bflood\w*\b/i],
];
const NOT_PLACE = new Set(["Fire","Police","Court","Man","Woman","Two","Three","Four","Five","Suspect","Suspects","Minister","Ghana","Ghanaian","Service","Building","Shops","The","A","An","Of","In","At","On","For","After","Over","Near","As","Storey","Old","Traffic","Light","Mp","Ceo","Gh"]);
function placeTokens(t: string): Set<string> {
  return new Set((t.match(/\b[A-Z][a-z]{3,}\b/g) || []).filter((w) => !NOT_PLACE.has(w)).map((w) => w.toLowerCase()));
}
function sameIncident(a: string, b: string): boolean {
  const ta = INCIDENT_TYPES.filter(([, re]) => re.test(a)).map(([k]) => k);
  if (!ta.length || !INCIDENT_TYPES.some(([k, re]) => ta.includes(k) && re.test(b))) return false;
  const pb = placeTokens(b);
  return [...placeTokens(a)].some((p) => pb.has(p) && /^(?:[a-z]+)$/.test(p) && p.length >= 4 && isGhanaPlace(p));
}
const GHANA_PLACES = /^(accra|tema|kasoa|kumasi|tamale|takoradi|sekondi|koforidua|techiman|sunyani|bolgatanga|damongo|dambai|nalerigu|goaso|winneba|obuasi|ashaiman|madina|nkawkaw|aflao|keta|hohoe|yendi|tarkwa|prestea|konongo|ejisu|nsawam|suhum|mampong|wenchi|kintampo|salaga|bawku|navrongo|elmina|saltpond|swedru|dansoman|adenta|teshie|nungua|kaneshie|lapaz|amasaman|weija|dodowa|somanya|kpong|akosombo|anloga|sogakope|axim|bibiani|sefwi|berekum|dormaa|atebubu|nkoranza|ejura|offinso|bekwai)$/;
function isGhanaPlace(p: string) { return GHANA_PLACES.test(p); }

// Same-story signals for merging a new source into an existing published article.
const AGENCY_OR_COURT = /\b(high court|circuit court|district court|supreme court|court of appeal|magistrate court|ghana police|police service|eoco|nacoc|chraj|special prosecutor|osp|ghana immigration|ghana prisons|attorney[- ]general|cid)\b/gi;
const NAME_STOP = new Set(["Ghana","Police","Court","High","Circuit","District","Supreme","Region","Regional","Municipal","Service","Office","Special","Prosecutor","Accra","Kumasi","The","Mr","Mrs","Ms","Dr","Hon","Chief","Inspector","Superintendent","Minister","President","Judge","Justice"]);
function personNames(t: string): Set<string> {
  const out = new Set<string>();
  for (const m of t.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) || []) {
    const parts = m.split(/\s+/).filter((w) => !NAME_STOP.has(w));
    if (parts.length >= 2) out.add(parts.join(" ").toLowerCase());
  }
  return out;
}
function placesAndAgencies(t: string): Set<string> {
  const out = new Set<string>([...placeTokens(t)].filter(isGhanaPlace));
  for (const m of t.match(AGENCY_OR_COURT) || []) out.add(m.toLowerCase());
  return out;
}
function sharesPersonAndVenue(a: string, b: string): boolean {
  const pa = personNames(a), pb = personNames(b);
  if (![...pa].some((x) => pb.has(x))) return false;
  const va = placesAndAgencies(a), vb = placesAndAgencies(b);
  return [...va].some((x) => vb.has(x));
}
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function gmtTime(d = new Date()) {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} GMT`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// judicial.gov.gh serves a valid Sectigo chain whose root (Public Server Authentication Root R46)
// is missing from the edge runtime's trust store. Trust that one public root for that host only;
// certificates are still fully verified.
const SECTIGO_R46 = `-----BEGIN CERTIFICATE-----
MIIFijCCA3KgAwIBAgIQdY39i658BwD6qSWn4cetFDANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNNDYwMzIxMjM1OTU5WjBfMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQDEy1TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYwggIiMA0GCSqGSIb3DQEB
AQUAA4ICDwAwggIKAoICAQCTvtU2UnXYASOgHEdCSe5jtrch/cSV1UgrJnwUUxDa
ef0rty2k1Cz66jLdScK5vQ9IPXtamFSvnl0xdE8H/FAh3aTPaE8bEmNtJZlMKpnz
SDBh+oF8HqcIStw+KxwfGExxqjWMrfhu6DtK2eWUAtaJhBOqbchPM8xQljeSM9xf
iOefVNlI8JhD1mb9nxc4Q8UBUQvX4yMPFF1bFOdLvt30yNoDN9HWOaEhUTCDsG3X
ME6WW5HwcCSrv0WBZEMNvSE6Lzzpng3LILVCJ8zab5vuZDCQOc2TZYEhMbUjUDM3
IuM47fgxMMxF/mL50V0yeUKH32rMVhlATc6qu/m1dkmU8Sf4kaWD5QazYw6A3OAS
VYCmO2a0OYctyPDQ0RTp5A1NDvZdV3LFOxxHVp3i1fuBYYzMTYCQNFu31xR13NgE
SJ/AwSiItOkcyqex8Va3e0lMWeUgFaiEAin6OJRpmkkGj80feRQXEgyDet4fsZfu
+Zd4KKTIRJLpfSYFplhym3kT2BFfrsU4YjRosoYwjviQYZ4ybPUHNs2iTG7sijbt
8uaZFURww3y8nDnAtOFr94MlI1fZEoDlSfB1D++N6xybVCi0ITz8fAr/73trdf+L
HaAZBav6+CuBQug4urv7qv094PPK306Xlynt8xhW6aWWrL3DkJiy4Pmi1KZHQ3xt
zwIDAQABo0IwQDAdBgNVHQ4EFgQUVnNYZJX5khqwEioEYnmhQBWIIUkwDgYDVR0P
AQH/BAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggIBAC9c
mTz8Bl6MlC5w6tIyMY208FHVvArzZJ8HXtXBc2hkeqK5Duj5XYUtqDdFqij0lgVQ
YKlJfp/imTYpE0RHap1VIDzYm/EDMrraQKFz6oOht0SmDpkBm+S8f74TlH7Kph52
gDY9hAaLMyZlbcp+nv4fjFg4exqDsQ+8FxG75gbMY/qB8oFM2gsQa6H61SilzwZA
Fv97fRheORKkU55+MkIQpiGRqRxOF3yEvJ+M0ejf5lG5Nkc/kLnHvALcWxxPDkjB
JYOcCj+esQMzEhonrPcibCTRAUH4WAP+JWgiH5paPHxsnnVI84HxZmduTILA7rpX
DhjvLpr3Etiga+kFpaHpaPi8TD8SHkXoUsCjvxInebnMMTzD9joiFgOgyY9mpFui
TdaBJQbpdqQACj7LzTWb4OE4y2BThihCQRxEV+ioratF4yUQvNs+ZUH7G6aXD+u5
dHn5HrwdVw1Hr8Mvn4dGp+smWg9WY7ViYG4A++MnESLn/pmPNPW56MORcr3Ywx65
LvKRRFHQV80MNNVIIb/bE/FmJUNS0nAiNs2fxBx1IK1jcmMGDw4nztJqDby1ORrp
0XZ60Vzk50lJLVU3aPAaOpg+VBeHVOmmJ1CJeyAvP/+/oYtKR5j/K3tJPsMpRmAY
QqszKbrAKbkTidOIijlBO8n9pu0f9GBj39ItVQGL
-----END CERTIFICATE-----`;
let judicialClient: any = null;
function clientFor(url: string): any {
  if (!/(^|\.)judicial\.gov\.gh$/.test(new URL(url).host)) return undefined;
  // @ts-ignore Deno API
  judicialClient ??= Deno.createHttpClient({ caCerts: [SECTIGO_R46] });
  return judicialClient;
}

async function fetchText(url: string, ms = 15000): Promise<string> {
  const client = clientFor(url);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    // Read the first response body even on 3xx: some feeds answer 302 with the feed in the body.
    const first = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*", "Accept-Encoding": "identity" }, redirect: "manual", signal: ctl.signal, client } as any);
    const firstBody = await first.text();
    if (first.status < 300 || /<rss|<feed|^\s*[\[{]/i.test(firstBody.slice(0, 500))) return firstBody;
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*", "Accept-Encoding": "identity" }, redirect: "follow", signal: ctl.signal, client } as any);
    const body = await r.text();
    return body;
  } finally {
    clearTimeout(t);
  }
}

const BOT_CHALLENGE = /One moment,? please|Challenge Validation|cf-chl|Just a moment\.\.\.|Just a moment|challenge-platform|Attention Required/i;

/** Robots rule matching per RFC 9309: '*' matches any run, trailing '$' anchors; rules are path prefixes. */
export function robotsRuleMatches(rule: string, path: string): boolean {
  if (!rule) return false;
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  if (!body.startsWith("/") && !body.startsWith("*")) return false; // malformed rule: ignore, never block whole site
  const re = new RegExp("^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

// ---- robots.txt (User-agent: * Disallow rules) ----
const robotsCache = new Map<string, string[]>();
async function allowedByRobots(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    if (!robotsCache.has(u.host)) {
      let rules: string[] = [];
      try {
        const txt = await fetchText(`${u.protocol}//${u.host}/robots.txt`, 6000);
        let applies = false;
        for (const line of txt.split(/\r?\n/)) {
          const [k, ...rest] = line.split(":");
          const key = (k || "").trim().toLowerCase();
          const val = rest.join(":").trim();
          if (key === "user-agent") applies = val === "*" || /ghanacrimes/i.test(val);
          else if (applies && key === "disallow" && val) rules.push(val);
        }
      } catch { rules = []; }
      robotsCache.set(u.host, rules);
    }
    const path = u.pathname + u.search;
    return !robotsCache.get(u.host)!.some((r) => robotsRuleMatches(r, path));
  } catch {
    return false;
  }
}

interface FeedItem { url: string; title: string; text: string; published_at: string | null }

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  if (!m) return "";
  return m[1].replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}

function parseFeed(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = stripHtml(tag(b, "link"));
    if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    const title = stripHtml(tag(b, "title"));
    const text = stripHtml(tag(b, "content:encoded") || tag(b, "content") || tag(b, "description") || tag(b, "summary"));
    const date = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    if (!link || !title) continue;
    const d = date ? new Date(stripHtml(date)) : null;
    out.push({ url: link.trim(), title, text, published_at: d && !isNaN(d.getTime()) ? d.toISOString() : null });
  }
  return out;
}

function parseWpJson(body: string): FeedItem[] {
  try {
    const arr = JSON.parse(body);
    if (!Array.isArray(arr)) return [];
    return arr.map((p: any) => ({
      url: p.link,
      title: stripHtml(p.title?.rendered || ""),
      text: stripHtml(p.content?.rendered || p.excerpt?.rendered || ""),
      published_at: p.date_gmt ? new Date(p.date_gmt + "Z").toISOString() : null,
    })).filter((i: FeedItem) => i.url && i.title);
  } catch {
    return [];
  }
}

/** Transient article-page text for grounding when the feed only carries a teaser. Never stored. */
async function fetchPageText(url: string): Promise<string> {
  if (!(await allowedByRobots(url))) return "";
  try {
    const html = await fetchText(url, 12000);
    const paras = (html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []).map(stripHtml).filter((p) => p.length > 40);
    return paras.join(" ").slice(0, 7000);
  } catch {
    return "";
  }
}

const CRIME_HINT = /\b(police|polic(e|ing) raid|arrest\w*|suspect\w*|wanted|court\w*|judge|magistrate|remand\w*|charged|charges|convict\w*|sentenc\w*|jail\w*|prison\w*|inmate\w*|bail|bailiffs?|prosecut\w*|Special Prosecutor|OSP|Attorney-General|robber\w*|rob(bed|bing)?|burglar\w*|theft|thie(f|ves)|steal\w*|stole\w*|stolen|murder\w*|homicide|kill\w*|stab\w*|shot( dead)?|shoot\w*|gun\w*|gunm[ae]n|machete|fraud\w*|defraud\w*|scam\w*|romance scam|cyber\w*|money launder\w*|galamsey|illegal mining|narcotic\w*|drug\w*|cocaine|cannabis|wee|heroin|tramadol|traffick\w*|smuggl\w*|corrupt\w*|brib\w*|embezzl\w*|misappropriat\w*|EOCO|NACOC|CHRAJ|NIB|Interpol|mob (justice|action|attack)|mob|lynch\w*|kidnap\w*|abduct\w*|assault\w*|battery|arson|set ablaze|defile\w*|rape\w*|crash\w*|accident|hit-and-run|knockdown|immigration|deport\w*|crime\w*|criminal|offence\w*|offender\w*|investigat\w*|custody|detain\w*)\b/i;
// Non-crime beats rejected before the AI budget when no crime language appears at all.
const NON_CRIME_HINT = /\b(football|Black Stars|Premier League|GPL|AFCON|match|goal|coach|athlete|album|concert|movie|showbiz|celebrity|music|budget statement|campaign rally|primaries|manifesto)\b/i;

const CATEGORY_FOR: Record<string, string> = {
  robbery: "property-crime", murder: "violent-crime", fraud_cyber: "fraud-scams", galamsey: "organised-crime",
  narcotics: "drug-offences", corruption: "white-collar-crime", road_crash_arrest: "traffic-offences",
  mob_violence: "violent-crime", court_judgement: "court-cases",
};

function hasValidSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.length > 3;
  } catch {
    return false;
  }
}

function categoryFor(analysis: Analysis, sourceText: string, domain: string): string {
  if (domain === "ghanaprisons.gov.gh") return "prison-news";
  const text = sourceText.toLowerCase();
  const politicalRhetoric = /\b(rally|manifesto|campaign|party congress|primaries|political opponent|propaganda|campaign promise)\b/.test(text);
  const concreteCrimeAction = /\b(arrest\w*|charged?|court|trial|bail|remand\w*|investigat\w*|complaint|warrant|convict\w*|sentenc\w*)\b/.test(text);
  if (politicalRhetoric && !concreteCrimeAction) return "";
  if (/\b(kidnap\w*|abduct\w*)\b/.test(text)) return "violent-crime";
  if (/\b(court|judge|magistrate|trial|bail|remand\w*|sentenc\w*|convict\w*)\b/.test(text)) return "court-cases";
  if (analysis.is_entertainment && !analysis.is_crime) return "";
  if (analysis.offence_type === "fraud_cyber" && !/\b(fraud\w*|defraud\w*|scam\w*|false pretence|money launder\w*|embezzl\w*)\b/.test(text)) return "police-reports";
  return CATEGORY_FOR[analysis.offence_type || ""] || "police-reports";
}

/** Parse the first balanced JSON object; tolerates trailing text after it. */
function extractJson<T>(content: string): T {
  try { return parseJson<T>(content); } catch { /* fall through */ }
  const start = content.indexOf("{");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i >= 0 && i < content.length; i++) {
    const c = content[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(content.slice(start, i + 1));
  }
  throw new Error("no JSON object in model output");
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 90).replace(/-$/, "");
}

const SYSTEM = `You are a wire-service desk editor for GhanaCrimes, a Ghana crime news site.
You receive SOURCE TEXT from one publisher. Return strict JSON only.
Rules for the draft:
- Write an ORIGINAL factual summary of 80 to 180 words in plain, neutral English. Do not copy sentences.
- Use ONLY facts present in the SOURCE TEXT. Never add names, numbers, dates, places, ages, motives or context that are not in it.
- Attribute explicitly: include "according to <publisher name>" (or the official body quoted in the source).
- Presumption of innocence: use alleged, suspected, arrested, charged, remanded. Never call anyone a killer, thief, criminal, murderer or robber unless the source says they were convicted.
- Never name the victim of a sexual offence or domestic violence. Never give any identifying detail (name, school, community, relatives) of anyone under 18.
- No home addresses, phone numbers or graphic descriptions of injuries or bodies.
- No commentary on guilt, evidence strength or likely outcomes of pending cases.
- Every sentence must be directly supported by the SOURCE TEXT. If a sentence cannot be traced to the source, leave it out. A shorter article is better than an unsupported one.
- No generic filler or boilerplate. Never write phrases like "continues to work to ensure public safety", "highlights the risks", "has been informed", "aims to deter", "the judge considered the evidence", "serves as a reminder", "remains committed to", "urged the public to remain vigilant".
- Headline and body must agree exactly on every name, role, age and place. Do not put a detail in the headline that the body does not state.
- Mention charges, the court and the next hearing date ONLY when the SOURCE TEXT states them. Never guess or imply them.
- No emojis, no em dashes or en dashes. Never mention AI.
Analysis fields describe the SOURCE TEXT:
offence_type must be one of: robbery, murder, fraud_cyber, galamsey, narcotics, corruption, road_crash_arrest, mob_violence, court_judgement, or null if none fits (road crashes count only with arrests or charges).
politics_without_enforcement is true when the main subject is party politics, campaign claims, policy talk or political rhetoric and the SOURCE TEXT reports no arrest, charge, court case, police action or official investigation.
case_status one of: reported, arrested, charged, remanded, on_trial, convicted, acquitted, unknown.
JSON shape:
{"analysis":{"is_ghana":bool,"ghanaian_central":bool,"region":string|null,"district":string|null,"is_entertainment":bool,"politics_without_enforcement":bool,"is_crime":bool,"offence_type":string|null,"case_status":string,"sexual_or_domestic_violence":bool,"victim_named":bool,"minor_involved":bool,"minor_identifiable":bool,"suspect_named":bool,"pending_case_commentary":bool,"graphic_content":bool},
"title":"neutral headline under 90 characters","summary":"one sentence standfirst","body":"80-180 word article, paragraphs separated by blank lines"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ---- auth ----
  const cronSecret = req.headers.get("x-cron-secret");
  let authed = false;
  if (cronSecret) {
    const { data } = await supabase.rpc("verify_cron_secret", { _secret: cronSecret });
    authed = data === true;
  } else {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await supabase.auth.getUser(token);
    if (u?.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      authed = (roles || []).some((r: any) => r.role === "admin" || r.role === "editor");
    }
  }
  if (!authed) return json({ error: "unauthorized" }, 401);

  // ---- settings + pause guard ----
  const { data: settingsRows } = await supabase.from("site_settings").select("key,value")
    .in("key", ["auto_publish_enabled", "auto_publish_daily_cap", "ingest_paused"]);
  const settings = Object.fromEntries((settingsRows || []).map((s: any) => [s.key, s.value]));
  const autoEnabled = settings.auto_publish_enabled !== false;
  const dailyCap = Number(settings.auto_publish_daily_cap ?? 20);
  const paused = settings.ingest_paused === true;

  // ---- single-flight lock ----
  const { data: running } = await supabase.from("pipeline_runs").select("id")
    .eq("kind", "ingest").eq("status", "running").gt("started_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
  if (running?.length) return json({ skipped: "another run in progress" });
  const { data: run } = await supabase.from("pipeline_runs").insert({ kind: "ingest" }).select("id").single();

  const stats = { sources_polled: 0, sources_failed: [] as string[], items_fetched: 0, new_items: 0, duplicates: 0,
    thread_updates: 0, too_old: 0, gated: 0, published: 0, review: 0, rejected: 0, errors: 0, ai_calls: 0, paused };
  const usage = newUsage();

  try {
    // ---- 1. poll sources ----
    const { data: sources } = await supabase.from("sources").select("*").eq("active", true)
      .or("feed_url.not.is.null,api_url.not.is.null,rss_url.not.is.null");
    const due = (sources || []).filter((s: any) =>
      !s.last_polled_at || Date.now() - new Date(s.last_polled_at).getTime() >= (s.poll_minutes - 1) * 60_000);
    const sourceById = new Map((sources || []).map((s: any) => [s.id, s]));
    const transientText = new Map<string, string>(); // url_hash -> full source text (memory only)

    await Promise.all(due.map(async (s: any) => {
      const url = s.feed_url || s.rss_url || s.api_url;
      const isJson = /\/wp-json\//.test(url) || (!s.feed_url && !s.rss_url && !!s.api_url);
      let status = "ok";
      try {
        if (!(await allowedByRobots(url))) { status = "blocked_by_robots"; return; }
        const body = await fetchText(url, /police\.gov\.gh/.test(url) ? 20000 : 15000);
        const head = body.slice(0, 4000);
        if (BOT_CHALLENGE.test(head)) throw new Error("bot_challenge");
        if (isJson ? !/^\s*\[/.test(body) : !/<rss|<feed|<rdf:RDF/i.test(head)) throw new Error("not_a_feed");
        const items = isJson ? parseWpJson(body) : parseFeed(body);
        status = `ok:${items.length}`;
        stats.items_fetched += items.length;
        // First poll of a newly added source: allow a one-time 7-day backlog into review.
        const maxAgeH = s.last_polled_at ? MAX_ITEM_AGE_H : FIRST_POLL_MAX_AGE_H;
        for (const it of items.slice(0, 30)) {
          if (!hasValidSourceUrl(it.url)) { stats.rejected++; continue; }
          if (it.published_at && Date.now() - new Date(it.published_at).getTime() > maxAgeH * 3600_000) { stats.too_old++; continue; }
          const urlHash = await sha(it.url.replace(/[?#].*$/, "").replace(/\/$/, ""));
          const { data: ins, error } = await supabase.from("raw_items").insert({
            source_id: s.id, url: it.url, url_hash: urlHash, title: it.title.slice(0, 300),
            summary: it.text.slice(0, SUMMARY_CHARS), published_at: it.published_at, hash: await sha(it.title.toLowerCase()),
          }).select("id").maybeSingle();
          if (error) continue; // url already seen
          if (ins) { stats.new_items++; transientText.set(ins.id, it.text); }
        }
      } catch (e) {
        status = `error:${String((e as Error).message || e).slice(0, 120)}`;
        stats.sources_failed.push(s.name);
      } finally {
        stats.sources_polled++;
        const failed = status.startsWith("error:") || status === "blocked_by_robots";
        await supabase.from("sources").update({ last_polled_at: new Date().toISOString(), last_status: status, consecutive_failures: failed ? (s.consecutive_failures ?? 0) + 1 : 0 }).eq("id", s.id);
      }
    }));

    // ---- 2. dedupe + gate + draft ----
    const { data: queue } = await supabase.from("raw_items").select("*").eq("status", "new").lt("attempts", 3)
      .order("fetched_at", { ascending: true }).limit(40);

    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: publishedToday } = await supabase.from("articles").select("id", { count: "exact", head: true })
      .eq("is_published", true).gte("published_at", startOfDay.toISOString()).eq("gate_report->>auto_published", "true");
    let autoCount = publishedToday || 0;
    let aiBudget = paused ? 0 : MAX_AI_ITEMS;
    const { data: recentRows } = await supabase.from("articles").select("id, title")
      .gte("created_at", new Date(Date.now() - 48 * 3600_000).toISOString()).neq("status", "rejected").limit(500);
    const recentIncidents: { id: string; title: string }[] = recentRows || [];
    const { data: publishedRecent } = await supabase.from("articles").select("id, title, summary")
      .eq("is_published", true).gte("published_at", new Date(Date.now() - 72 * 3600_000).toISOString()).limit(500);
    const merges: { article_id: string; raw_item_id: string; source: string; reason: string }[] = [];

    // Append a new source to an existing published article instead of creating a new URL.
    const mergeInto = async (articleId: string, item: any, src: any, reason: string) => {
      const { data: art } = await supabase.from("articles").select("id, body, source_url, source_urls, thread_id, title").eq("id", articleId).maybeSingle();
      if (!art) return false;
      const urls: string[] = Array.from(new Set([...(art.source_urls || []), art.source_url, item.url].filter(Boolean)));
      if ((art.source_urls || []).includes(item.url) || art.source_url === item.url) {
        await supabase.from("raw_items").update({ status: "duplicate", reason: `already sourced in ${art.id}`, article_id: art.id }).eq("id", item.id);
        stats.duplicates++; return true;
      }
      const para = `<p><strong>Update (${gmtTime()}):</strong> ${escHtml(src.name)} also reported on this story under the headline "${escHtml(item.title)}". <a href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer nofollow">Read the ${escHtml(src.name)} report</a>.</p>`;
      let threadId = art.thread_id;
      if (!threadId) {
        const { data: t } = await supabase.from("story_threads").insert({ thread_slug: `${slugify(art.title).slice(0, 60)}-${Date.now().toString(36)}`, title: art.title, created_by: "source-ingest" }).select("id").single();
        threadId = t?.id ?? null;
      }
      // Body change fires the content_updated_at trigger.
      await supabase.from("articles").update({ body: `${art.body}${para}`, source_urls: urls, thread_id: threadId }).eq("id", art.id);
      if (threadId) {
        await supabase.from("thread_updates").insert({ thread_id: threadId, title: item.title.slice(0, 200), body: para, source_article_id: art.id, published_at: new Date().toISOString() });
      }
      await supabase.from("raw_items").update({ status: "merged", reason, article_id: art.id, thread_id: threadId }).eq("id", item.id);
      merges.push({ article_id: art.id, raw_item_id: item.id, source: src.name, reason });
      return true;
    };

    for (const item of queue || []) {
      const src: any = sourceById.get(item.source_id);
      if (!src) continue;

      // Dedup against recent articles (title similarity) and story threads
      const { data: similar } = await supabase.rpc("find_similar_articles", { _title: item.title, _hours: 72 });
      const best = (similar || [])[0];
      // Merge into an already-published article: title similarity >= 0.45, or same named person + same court/town/agency.
      const publishedIds = new Set((publishedRecent || []).map((a: any) => a.id));
      const simPublished = (similar || []).find((r: any) => r.sim >= 0.45 && publishedIds.has(r.id));
      const itemText = `${item.title} ${item.summary || ""}`;
      const personMatch = simPublished ? null : (publishedRecent || []).find((a: any) => sharesPersonAndVenue(itemText, `${a.title} ${a.summary || ""}`));
      const mergeTarget = simPublished?.id || personMatch?.id;
      if (mergeTarget && await mergeInto(mergeTarget, item, src, simPublished ? `title_similarity:${Number(simPublished.sim).toFixed(2)}` : "same_person_and_venue")) {
        stats.thread_updates++; continue;
      }
      if (best && best.sim > 0.6) {
        await supabase.from("raw_items").update({ status: "duplicate", reason: `matches article ${best.id}`, article_id: best.id, thread_id: best.thread_id }).eq("id", item.id);
        stats.duplicates++; continue;
      }
      // Same-incident guard: same place + same incident type within 48h is one story.
      const incidentMatch = recentIncidents.find((r) => sameIncident(item.title, r.title));
      // One URL per incident: a same-incident item for a published article becomes an Update on it.
      if (incidentMatch && publishedIds.has(incidentMatch.id) && await mergeInto(incidentMatch.id, item, src, "same_incident")) {
        stats.thread_updates++; continue;
      }
      if (incidentMatch) {
        await supabase.from("raw_items").update({ status: "duplicate", reason: `same incident as article ${incidentMatch.id}`, article_id: incidentMatch.id }).eq("id", item.id);
        stats.duplicates++; continue;
      }
      let threadId: string | null = best?.thread_id ?? null;
      if (best && best.sim > 0.45) {
        const last = new Date(best.published_at || best.created_at).getTime();
        if (Date.now() - last < 6 * 3600_000) {
          await supabase.from("raw_items").update({ status: "thread_update", reason: `thread update within 6h of ${best.id}`, article_id: best.id, thread_id: threadId }).eq("id", item.id);
          stats.thread_updates++; continue;
        }
      }

      // Discovery-only sources never stand alone: they need a primary source for the same story.
      if (src.type === "discovery") {
        const { data: sibD } = await supabase.rpc("find_similar_raw_items", { _title: item.title, _exclude: item.id, _hours: 48 });
        const hasPrimary = (sibD || []).some((r: any) => { const s2: any = sourceById.get(r.source_id); return s2 && s2.type !== "discovery"; });
        if (!hasPrimary) {
          await supabase.from("raw_items").update({ status: "discovery", reason: "discovery_only_awaiting_primary_source" }).eq("id", item.id);
          continue;
        }
      }

      // Cheap keyword pre-filter: skip obvious non-crime items without spending AI credits
      const pre = `${item.title} ${transientText.get(item.id) || item.summary || ""}`;
      if (!CRIME_HINT.test(pre)) {
        const why = NON_CRIME_HINT.test(pre) ? "non_crime_beat (keyword prefilter)" : "not_in_crime_scope (keyword prefilter)";
        await supabase.from("raw_items").update({ status: "rejected", reason: why }).eq("id", item.id);
        stats.rejected++; continue;
      }

      if (aiBudget <= 0) break; // leave remaining items as 'new' for the next run
      aiBudget--;

      // Corroboration: same story from another independent source in the last 48h
      const { data: sib } = await supabase.rpc("find_similar_raw_items", { _title: item.title, _exclude: item.id, _hours: 48 });
      const otherSources = new Set((sib || []).map((r: any) => r.source_id).filter((id: string) => id !== item.source_id));
      const corroborating = otherSources.size;
      const sourceUrls = [item.url];
      for (const r of sib || []) {
        if (otherSources.has(r.source_id)) {
          const { data: ri } = await supabase.from("raw_items").select("url").eq("id", r.id).maybeSingle();
          if (ri?.url && !sourceUrls.includes(ri.url)) sourceUrls.push(ri.url);
        }
      }

      let sourceText = `${item.title}. ${transientText.get(item.id) || item.summary || ""}`;
      if (wordCount(sourceText) < 120) {
        const page = await fetchPageText(item.url);
        if (page) sourceText = `${item.title}. ${page}`;
      }
      sourceText = sourceText.slice(0, 7000);

      try {
        const { content } = await callGateway(Deno.env.get("LOVABLE_API_KEY")!, usage, {
          system: SYSTEM,
          user: `PUBLISHER: ${src.name}\nURL: ${item.url}\nSOURCE TEXT:\n${sourceText}`,
          max_tokens: 900, json: true, temperature: 0.1,
        });
        stats.ai_calls++;
        const out = extractJson<{ analysis: Analysis; title: string; summary: string; body: string }>(content);
        const body = stripEditorialFiller((out.body || "").replace(/[\u2013\u2014]/g, ", ")).trim();
        const title = stripEditorialFiller((out.title || item.title).replace(/[\u2013\u2014]/g, ", ")).trim().slice(0, 120);
        const gate = runGate({ analysis: out.analysis || {}, draftTitle: title, draftBody: body, sourceText, isOfficial: src.trust_tier === 1, corroboratingSources: corroborating });
        stats.gated++;

        const report: any = { ...gate, analysis: out.analysis, source: src.name, source_tier: src.trust_tier, corroborating_sources: corroborating, raw_item_id: item.id, checked_at: new Date().toISOString() };

        if (gate.hard_fails.length) {
          await supabase.from("raw_items").update({ status: "rejected", reason: gate.hard_fails.join(", "), gate_report: report }).eq("id", item.id);
          stats.rejected++; continue;
        }

        const eligible = gate.soft_flags.length === 0 && (src.trust_tier === 1 || corroborating >= 1);
        // No daily cap: duplicates are prevented by merge/one-URL-per-incident. Discovery items always go to review.
        const publishNow = eligible && autoEnabled && src.type !== "discovery";
        report.auto_publish_eligible = eligible;
        report.auto_published = publishNow;
        if (eligible && !publishNow) report.held_reason = !autoEnabled ? "auto_publish_disabled" : "discovery_source_review_only";

        // Thread: reuse matched thread or open one for older related coverage
        if (!threadId && best && best.sim > 0.45) {
          const { data: t } = await supabase.from("story_threads").insert({ thread_slug: `${slugify(title).slice(0, 60)}-${Date.now().toString(36)}`, title, created_by: "source-ingest" }).select("id").single();
          threadId = t?.id ?? null;
          if (threadId) await supabase.from("articles").update({ thread_id: threadId }).eq("id", best.id).is("thread_id", null);
        }

        let slug = slugify(title) || "story";
        for (let n = 2; ; n++) {
          const { data: ex } = await supabase.from("articles").select("id").eq("article_slug", slug).maybeSingle();
          if (!ex) break;
          slug = `${slugify(title)}-${n}`;
        }
        const category = categoryFor(out.analysis || {}, sourceText, src.domain);
        if (!category) {
          await supabase.from("raw_items").update({ status: "rejected", reason: "non_crime_entertainment_or_political_rhetoric", gate_report: report }).eq("id", item.id);
          stats.rejected++; continue;
        }
        const html = body.split(/\n\s*\n/).map((p) => `<p>${p.replace(/</g, "&lt;")}</p>`).join("");

        const { data: art, error: artErr } = await supabase.from("articles").insert({
          title, summary: (out.summary || "").slice(0, 300), body: html, category_slug: category, article_slug: slug,
          status: publishNow ? "published" : "review", source_url: item.url, source_urls: sourceUrls,
          source_published_at: item.published_at, gate_report: report, region: out.analysis?.region || detectRegion(sourceText),
          offence_type: out.analysis?.offence_type || null, case_status: out.analysis?.case_status || null,
          thread_id: threadId, author_name: null, hero_image: null,
          seo_title: title.slice(0, 60), seo_description: (out.summary || "").slice(0, 155),
        }).select("id").single();
        if (artErr) throw artErr;
        recentIncidents.push({ id: art.id, title: item.title });
        if (publishNow) (publishedRecent as any[] | null)?.push({ id: art.id, title, summary: out.summary || "" });

        try {
          const image = await extractHeroImage({ articleUrl: item.url }, art.id, supabase);
          if (image.url) await supabase.from("articles").update({ hero_image: image.url }).eq("id", art.id);
        } catch {
          // No safe source image: the public UI renders a category-coloured text card.
        }

        await supabase.from("raw_items").update({ status: publishNow ? "published" : "review", article_id: art.id, thread_id: threadId, gate_report: report, reason: gate.soft_flags.join(", ") || report.held_reason || null }).eq("id", item.id);
        await supabase.from("audit_logs").insert({ action: publishNow ? "auto_published" : "sent_to_review", resource_type: "article", resource_id: art.id, details: { raw_item_id: item.id, flags: gate.soft_flags, source: src.name } });
        if (publishNow) { stats.published++; autoCount++; } else stats.review++;
      } catch (e) {
        if (e instanceof AiCreditError) {
          if (e.status === 402) await supabase.from("site_settings").update({ value: true }).eq("key", "ingest_paused");
          stats.errors++;
          (stats as any).stopped = e.message;
          break;
        }
        stats.errors++;
        await supabase.from("raw_items").update({ attempts: (item.attempts || 0) + 1, reason: String((e as Error).message || e).slice(0, 300), status: (item.attempts || 0) + 1 >= 3 ? "error" : "new" }).eq("id", item.id);
      }
    }

    (stats as any).merged = merges.length;
    await supabase.from("pipeline_runs").update({ status: "ok", finished_at: new Date().toISOString(), stats: { ...stats, merges, usage } }).eq("id", run!.id);
    return json({ ok: true, stats, merges, usage });
  } catch (e) {
    await supabase.from("pipeline_runs").update({ status: "error", finished_at: new Date().toISOString(), error: String((e as Error).message || e), stats }).eq("id", run!.id);
    return json({ error: String((e as Error).message || e), stats }, 500);
  }
});
