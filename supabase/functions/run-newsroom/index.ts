import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWS_SOURCES = [
  { name: "Ghana Police Service", domain: "police.gov.gh", rss: null },
  { name: "Graphic Online", domain: "graphic.com.gh", rss: "https://www.graphic.com.gh/feed" },
  { name: "Citi Newsroom", domain: "citinewsroom.com", rss: "https://citinewsroom.com/feed/" },
  { name: "GhanaWeb", domain: "ghanaweb.com", rss: "https://www.ghanaweb.com/GhanaHomePage/crime/rss.xml" },
  { name: "Modern Ghana", domain: "modernghana.com", rss: "https://www.modernghana.com/rss/" },
  { name: "MyJoyOnline", domain: "myjoyonline.com", rss: "https://www.myjoyonline.com/feed/" },
  { name: "Starr FM", domain: "starrfm.com.gh", rss: "https://starrfm.com.gh/feed/" },
  { name: "Peace FM", domain: "peacefmonline.com", rss: "https://www.peacefmonline.com/pages/local/crime/rss.xml" },
  { name: "GBC Ghana Online", domain: "gbcghanaonline.com", rss: "https://www.gbcghanaonline.com/feed/" },
  { name: "Kessben Online", domain: "kessbenonline.com", rss: null },
  { name: "Adom Online", domain: "adomonline.com", rss: "https://www.adomonline.com/feed/" },
  { name: "3News", domain: "3news.com", rss: "https://3news.com/feed/" },
  { name: "TV3 Ghana", domain: "tv3network.com", rss: null },
  { name: "Pulse Ghana", domain: "pulse.com.gh", rss: "https://www.pulse.com.gh/rss" },
  { name: "Ghana News Agency", domain: "gna.org.gh", rss: "https://gna.org.gh/feed/" },
];

// Crime-related keywords to filter RSS items
const CRIME_KEYWORDS = [
  'crime', 'criminal', 'murder', 'kill', 'dead', 'death', 'arrest', 'police',
  'court', 'judge', 'sentence', 'jail', 'prison', 'robbery', 'robber', 'steal',
  'theft', 'thief', 'fraud', 'scam', 'assault', 'attack', 'stab', 'shoot',
  'gun', 'drug', 'narcotic', 'rape', 'abuse', 'domestic violence', 'kidnap',
  'missing', 'suspect', 'accused', 'convict', 'bail', 'remand', 'cybercrime',
  'hack', 'corruption', 'bribe', 'arson', 'fire', 'vandal', 'mob', 'lynch',
  'defraud', 'forgery', 'smuggle', 'trafficking', 'wanted', 'manhunt',
  'burglary', 'extortion', 'threat', 'victim', 'homicide', 'manslaughter',
];

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
    
    if (title) {
      items.push({
        source_name: sourceName,
        original_headline: title,
        original_summary: cleanSummary,
        source_url: link || null,
        pub_date: pubDate ? new Date(pubDate) : null,
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

// Filter RSS items to crime-related stories within the freshness window
function filterCrimeItems(items: any[], maxAgeHours: number): any[] {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  return items.filter(item => {
    // Check freshness
    if (item.pub_date && item.pub_date < cutoff) return false;
    
    // Check if crime-related
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

// PHOTO-FIRST EDITORIAL IMAGE POLICY
// Every article must be illustrated with an image that reads as a real photograph.
// AI may only be used as a hidden fallback to generate photo-realistic stock-style imagery.
// No illustrations, digital art, concept art, cartoons, infographics, or stylised visuals.

const PHOTOREALISTIC_PROMPT_PREFIX = `Ultra-realistic editorial photograph, shot on Canon EOS R5, natural lighting, low saturation, calm observational tone, no text overlay, no logos, no watermarks, no filters, no dramatic cinematic effects, 16:9 aspect ratio. The image must be indistinguishable from a real wire service photograph.`;

// Image sourcing strategy types - follows strict priority order
type ImageStrategy = 'real_story_photo' | 'contextual_real_photo' | 'environmental_photo' | 'ai_photorealistic';

interface ImageAnalysis {
  strategy: ImageStrategy;
  subject_name?: string;
  subject_type?: 'politician' | 'celebrity' | 'public_figure' | 'location' | 'building' | 'institution' | 'commodity' | 'infrastructure';
  search_query?: string;
  photo_description?: string;
}

// Analyze article to determine best image sourcing strategy following STRICT PRIORITY ORDER:
// 1. Real photos tied directly to the story (buildings, press rooms, locations)
// 2. Contextual real-world photos (sector-appropriate: cocoa farms, banks, ports)
// 3. Representative environmental photography (streets, skylines, offices, objects)
// 4. AI-generated photorealistic fallback ONLY (must look like real stock photo)
async function analyzeImageStrategy(
  headline: string,
  summary: string,
  body: string,
  lovableApiKey: string
): Promise<ImageAnalysis> {
  const analysisPrompt = `You are an editorial photo desk editor for a serious international news website modeled after the Financial Times.

Analyze this news article and determine the best PHOTOGRAPH sourcing strategy.

HEADLINE: ${headline}
SUMMARY: ${summary}

STRICT IMAGE SOURCING PRIORITY (follow this exact order):

PRIORITY 1 - "real_story_photo": Direct photographs tied to the story
- Government buildings, offices, press rooms mentioned in the story
- Farms, factories, ports, markets, infrastructure involved
- Exterior shots of institutions mentioned
- Wide shots of cities, regions, or landscapes involved
- IMPORTANT: Do NOT search for photos of specific named individuals or identifiable people

PRIORITY 2 - "contextual_real_photo": Generic but truthful sector photographs
- Generic cocoa farms, oil storage tanks, data centres, banks, ports
- Neutral archive photos that accurately represent the industry or activity
- Stock-style photos of the sector without specific branding

PRIORITY 3 - "environmental_photo": Representative environmental photography
- Streets, skylines, offices, meeting rooms, workspaces
- Objects involved (documents, commodities, machinery, produce)
- Generic workplace or urban scenes related to the topic

PRIORITY 4 - "ai_photorealistic": AI-generated ONLY as last resort
- Output must be indistinguishable from a real photograph
- Only generic scenes, environments, or objects
- NEVER identifiable people, named individuals, or specific events
- Must look like a neutral stock photo from a wire service

RULES:
- NEVER suggest searching for photos of identifiable/named people
- NEVER suggest illustrations, digital art, or stylised imagery
- Always prefer real photographs over AI generation
- For sensitive topics (deaths, violence), prefer environmental/contextual shots

Return ONLY valid JSON:
{
  "strategy": "real_story_photo" | "contextual_real_photo" | "environmental_photo" | "ai_photorealistic",
  "subject_name": "Place, institution, or sector name (NEVER a person's name)",
  "subject_type": "location" | "building" | "institution" | "commodity" | "infrastructure" | null,
  "search_query": "Optimized search query for finding a REAL PHOTOGRAPH (no people's names)",
  "photo_description": "Brief description of what the ideal photograph would show"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a photo desk editor for a Financial Times-style publication. You source real photographs only. You NEVER suggest photos of identifiable people. Return only valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.log("Image strategy analysis failed, defaulting to AI photorealistic");
      return { strategy: 'ai_photorealistic' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const analysis = JSON.parse(jsonMatch[1] || content);
    
    console.log(`Image strategy: ${analysis.strategy} for "${analysis.subject_name || 'N/A'}"`);
    return analysis;
  } catch (e) {
    console.error("Image strategy analysis error:", e);
    return { strategy: 'ai_photorealistic' };
  }
}

// Search for real photograph using web search
async function searchForRealPhoto(
  searchQuery: string,
  subjectType: string | undefined,
  lovableApiKey: string
): Promise<string | null> {
  try {
    const searchPrompt = `Find a high-quality, publicly available PHOTOGRAPH of: ${searchQuery}

STRICT REQUIREMENTS:
- Must be a REAL PHOTOGRAPH (absolutely no illustrations, digital art, AI-generated images, or infographics)
- Should be from a reputable news source, government website, stock photo service, or official site
- Image should be clear, professional quality, calm editorial tone
- Must show places, buildings, environments, objects, or landscapes — NEVER identifiable people's faces
- For locations: clear daytime photos, neutral framing, no dramatic effects
- For institutions: exterior shots, official buildings, signage visible
- For commodities/sectors: generic representative photos (farms, factories, markets)

Return ONLY a JSON object with:
{
  "image_url": "direct URL to the image file (must end in .jpg, .png, .webp or be a direct image link)",
  "source": "where the image is from",
  "description": "brief description of what the photograph shows",
  "found": true/false
}

If you cannot find a suitable real photograph, return: {"found": false}
Do NOT return illustrations, digital art, or AI-generated imagery.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a wire service photo researcher. You find only real photographs — never illustrations or AI art. Return only valid JSON." },
          { role: "user", content: searchPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.log("Photo search failed");
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const result = JSON.parse(jsonMatch[1] || content);
    
    if (result.found && result.image_url) {
      console.log(`Found real photograph: ${result.image_url} from ${result.source}`);
      return result.image_url;
    }
    
    return null;
  } catch (e) {
    console.error("Photo search error:", e);
    return null;
  }
}

// Download and upload external image to Supabase storage
async function downloadAndUploadImage(
  imageUrl: string,
  articleSlug: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaCrimes/1.0)',
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to download image: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const imageBuffer = new Uint8Array(buffer);
    
    // Determine file extension
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    
    const imagePath = `newsroom/${articleSlug}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(imagePath, imageBuffer, {
        contentType: contentType,
        upsert: true
      });
    
    if (uploadError) {
      console.error("Image upload failed:", uploadError);
      return null;
    }
    
    const { data: publicUrl } = supabase.storage
      .from("article-images")
      .getPublicUrl(imagePath);
    
    console.log(`Uploaded real image: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (e) {
    console.error("Download/upload error:", e);
    return null;
  }
}

// AI image enhancement has been removed per Photo-First Editorial Policy.
// AI is only used as a last-resort fallback to generate photorealistic stock-style images.

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

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger_type || "manual";

    // Clean up stale "running" runs (older than 10 minutes) - they are timed-out ghosts
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
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
    const MAX_AGE_HOURS = 20; // Strict 20-hour freshness cutoff
    const today = new Date().toISOString().split('T')[0];
    
    console.log("Step 1A: Scanning RSS feeds from whitelisted sources...");
    
    // Fetch all RSS feeds in parallel
    const rssPromises = NEWS_SOURCES.map(source => fetchRSSFeed(source));
    const rssResults = await Promise.all(rssPromises);
    const allRssItems = rssResults.flat();
    
    console.log(`RSS total: ${allRssItems.length} raw items from ${NEWS_SOURCES.filter(s => s.rss).length} feeds`);
    
    // Filter to crime-related items within 20-hour window
    const freshCrimeItems = filterCrimeItems(allRssItems, MAX_AGE_HOURS);
    console.log(`RSS filtered: ${freshCrimeItems.length} crime items within ${MAX_AGE_HOURS}h window`);
    
    // Convert RSS items to standard format
    const rssNewsItems = freshCrimeItems.map(item => ({
      source_name: item.source_name,
      original_headline: item.original_headline,
      original_summary: item.original_summary,
      source_url: item.source_url,
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
      const searchPrompt = `Search the web for the latest crime news from Ghana published in the last 20 hours.

Preferred sources: ${sourcesList}.

Today's date and time is ${new Date().toISOString()}. Only return news published within the last 20 hours.
Only return CURRENT news — no stories about past holidays, events older than 20 hours.

Return a JSON array of 5-10 real crime news items. Each item must have:
- source_name: The news outlet name
- original_headline: The exact headline from the source
- original_summary: A brief 1-2 sentence summary of the story
- source_url: The actual URL where this story was published (must be a real URL you found)
- category_hint: One of: ${VALID_CATEGORIES.join(", ")}
- estimated_date: Publication date in YYYY-MM-DD format

Focus on: murders, robberies, fraud, court proceedings, police operations, arrests, drug busts, cybercrime, domestic violence cases.

Return ONLY a valid JSON array, no other text.`;

      const searchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a news wire service that finds and reports real, current news stories. You must search the web and return only verifiable news items with real URLs. Return only valid JSON." },
            { role: "user", content: searchPrompt }
          ],
          tools: [{ google_search: {} }],
        }),
      });

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
      
      // Check estimated_date — enforce 20-hour cutoff
      if (item.estimated_date) {
        const estimatedDate = new Date(item.estimated_date);
        if (estimatedDate < twentyHoursAgo) {
          console.log(`Filtering outdated story (date: ${item.estimated_date}): ${headline}`);
          return true;
        }
      }
      
      return false;
    };
    
    // Filter out outdated stories
    const currentNewsItems = newsItems.filter(item => !isOutdatedStory(item));
    const outdatedSkipped = newsItems.length - currentNewsItems.length;
    if (outdatedSkipped > 0) {
      console.log(`Filtered ${outdatedSkipped} outdated stories`);
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

    // Insert only unique news items as pending
    const newsRecords = uniqueNewsItems.map(item => ({
      run_id: run.id,
      source_name: item.source_name || "Unknown",
      original_headline: item.original_headline || item.headline || "Untitled",
      original_summary: item.original_summary || item.summary || "",
      source_url: item.source_url || null,
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

    // Step 3: Process only unique (non-duplicate) items
    let articlesCreated = 0;
    const pendingItems = (insertedNews || []).filter(item => item.processing_status === "pending");

    for (const newsItem of pendingItems) {
      try {
        // Update status to processing
        await supabase.from("newsroom_articles").update({
          processing_status: "processing",
        }).eq("id", newsItem.id);

        // Build list of recently published slugs for duplicate suppression by AI
        const recentSlugsList = Array.from(existingSlugs).slice(0, 50).join(", ");

        // Generate full article using AI — comprehensive newsroom master prompt
        const articlePrompt = `You are running an automated newsroom cycle.

TODAY'S DATE IS ${today}

The system has already scanned approved crime news sources and collected raw items.

You will receive ONE scanned item to process.

SCANNED ITEM:
headline: ${newsItem.original_headline}
summary: ${newsItem.original_summary}
source: ${newsItem.source_name}
url: ${newsItem.source_url || "unknown"}

PREVIOUSLY PUBLISHED SLUGS (last 7 days):
${recentSlugsList || "none"}

---

STEP 1 DUPLICATE SUPPRESSION

The system stores previously published slugs listed above.
If this event matches a previously published slug or is clearly the same incident already covered within the last 48 hours, return:

headline = DUPLICATE_SKIP
All other fields empty.

---

STEP 2 FRESHNESS RULE

If the event is more than 30 days old based on verified publication dates, return:

headline = OUTDATED_SKIP
All other fields empty.

Never update old stories to appear recent.

---

STEP 3 VERIFICATION CHECK

Before writing:

Confirm key facts across at least two credible sources where possible.

Prefer
Police statements
Court filings
Official agency releases
Named spokesperson quotes

If a detail appears in only one source, clearly attribute it.
If details conflict, report both versions and attribute each.
Never invent names, numbers, dates, or quotes.

If you cannot verify key facts at all, return:

headline = INSUFFICIENT_VERIFICATION
All other fields empty.

---

STEP 4 WRITING STYLE ENFORCEMENT

The article must:

Use short sentences.
Use simple everyday words.
Avoid legal jargon unless explained simply.
Avoid dramatic language.
Remain neutral.
Respect presumption of innocence.

The tone must be serious, investigative, and fact based.
The reading level must be understandable by a 10 year old.

---

STEP 5 ARTICLE STRUCTURE

Generate the following JSON fields.

headline
Short and factual. Max 80 characters.

subtitle
One clear sentence expanding the headline.

summary
Plain English. Max 500 characters.

body
6 to 10 HTML paragraphs using <p> tags.
Each paragraph 2 to 4 short sentences.
Must include source attribution inside paragraphs.
Explain clearly
What happened
Where
When
Who was involved
What authorities said
What legal action follows
Why it matters

seo_description
Max 155 characters.

slug
Lowercase with hyphens.

section
Choose from: ${VALID_CATEGORIES.join(", ")}.

tags
Array including location, agency, crime type, key individuals.

twitter_post
Maximum 140 characters.
No emojis.
No hashtags.
No links.
If it exceeds 140 characters, rewrite until it fits.

photo_description
Describe a real world photograph.
Maximum 50 words.
No faces described.
No illustrations.

---

OUTPUT RULE

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
  "photo_description": "..."
}`;

        const articleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
        model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are the GhanaCrimes Automated Newsroom Engine. You operate as a professional investigative crime journalist, fact checker, and editor. You must write in very clear, simple English that a 10 year old can understand, while maintaining the accuracy and discipline of a top investigative newsroom. Return only valid JSON. Never use colons, long dashes, bullet points, emojis, hashtags, or URLs. Always attribute claims to named sources inside the text." },
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

        // Skip flags from AI verification
        const skipFlag = articleJson.headline;
        if (skipFlag === "OUTDATED_SKIP" || skipFlag === "DUPLICATE_SKIP" || skipFlag === "INSUFFICIENT_VERIFICATION") {
          const statusMap: Record<string, string> = {
            "OUTDATED_SKIP": "outdated",
            "DUPLICATE_SKIP": "duplicate",
            "INSUFFICIENT_VERIFICATION": "unverified",
          };
          const reasonMap: Record<string, string> = {
            "OUTDATED_SKIP": "AI verification determined this story is outdated",
            "DUPLICATE_SKIP": "AI verification determined this is a duplicate of a recently published story",
            "INSUFFICIENT_VERIFICATION": "AI could not verify key facts across multiple sources",
          };
          console.log(`AI flagged story as ${skipFlag}, skipping: ${newsItem.original_headline}`);
          await supabase.from("newsroom_articles").update({
            processing_status: statusMap[skipFlag],
            error_message: reasonMap[skipFlag],
          }).eq("id", newsItem.id);
          continue;
        }

        // Use AI-generated slug or create from headline
        const slugBase = (articleJson.slug || articleJson.headline || "article")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 80);

        const articleSlug = `${slugBase}-${Date.now()}`;

        // PHOTO-FIRST IMAGE SOURCING — strict editorial policy
        let heroImageUrl: string | null = null;
        let imageSourceType: string = 'ai_photorealistic';
        
        try {
          // Step 1: Analyze what photo strategy to use (real photo priority)
          const imageAnalysis = await analyzeImageStrategy(
            articleJson.headline,
            articleJson.summary || newsItem.original_summary,
            articleJson.body,
            lovableApiKey
          );
          
          imageSourceType = imageAnalysis.strategy;
          
          // For all real-photo strategies, attempt to find and download
          if (imageAnalysis.strategy !== 'ai_photorealistic') {
            console.log(`Photo-first: searching for real photograph — ${imageAnalysis.strategy}: ${imageAnalysis.search_query}`);
            const realPhotoUrl = await searchForRealPhoto(
              imageAnalysis.search_query || imageAnalysis.subject_name || articleJson.headline,
              imageAnalysis.subject_type,
              lovableApiKey
            );
            
            if (realPhotoUrl) {
              heroImageUrl = await downloadAndUploadImage(realPhotoUrl, articleSlug, supabase);
              if (heroImageUrl) {
                console.log(`Photo-first: successfully sourced real photograph for "${imageAnalysis.subject_name}"`);
              }
            }
          }
          
          // FALLBACK: AI-generated photorealistic image (hidden tool only)
          // Must be indistinguishable from a real photograph
          if (!heroImageUrl) {
            console.log("Photo-first: no real photo found, generating photorealistic AI fallback");
            imageSourceType = 'ai_photorealistic';
            
            const photoDescription = articleJson.photo_description || articleJson.image_prompt || `Generic scene related to ${articleJson.headline}`;
            const photoPrompt = `${PHOTOREALISTIC_PROMPT_PREFIX} ${photoDescription}. Ghana, West Africa setting. The scene must look like it was taken by a news photographer with a professional camera. No people's faces visible. No text. No signage with readable words.`;
            
            console.log(`Generating photorealistic AI image`);
            
            const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image",
                messages: [
                  { role: "user", content: photoPrompt }
                ],
                modalities: ["image", "text"]
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

              if (base64Image && base64Image.startsWith("data:image")) {
                const base64Data = base64Image.split(",")[1];
                const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                const imagePath = `newsroom/${articleSlug}.png`;
                const { error: uploadError } = await supabase.storage
                  .from("article-images")
                  .upload(imagePath, imageBuffer, {
                    contentType: "image/png",
                    upsert: true
                  });

                if (!uploadError) {
                  const { data: publicUrl } = supabase.storage
                    .from("article-images")
                    .getPublicUrl(imagePath);
                  heroImageUrl = publicUrl.publicUrl;
                  console.log(`Photo-first: uploaded AI photorealistic image: ${heroImageUrl}`);
                } else {
                  console.error("Image upload failed:", uploadError);
                }
              }
            } else {
              console.error("AI photorealistic image generation failed:", imageResponse.status);
            }
          }
        } catch (imgError) {
          console.error("Photo sourcing error:", imgError);
        }

        // Update newsroom article with image source type
        await supabase.from("newsroom_articles").update({
          image_style: imageSourceType,
        }).eq("id", newsItem.id);

        // Insert the article and auto-publish
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
            twitter_post: articleJson.twitter_post || null,
            is_published: true,
            published_at: new Date().toISOString(),
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
