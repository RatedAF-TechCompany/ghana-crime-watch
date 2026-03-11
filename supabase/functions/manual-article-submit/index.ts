import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CATEGORIES = [
  "top-stories",
  "violent-crime",
  "property-crime",
  "cybercrime",
  "fraud-scams",
  "drug-offences",
  "domestic-violence",
  "traffic-offences",
  "youth-crime",
  "organised-crime",
  "white-collar-crime",
  "police-reports",
  "court-cases",
  "prison-news",
  "crime-prevention",
  "crime-statistics",
  "investigations",
  "most-wanted",
];

// Peak publishing hours in GMT
const PEAK_HOURS = [7, 9, 12, 15, 18, 20];

function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  const categoryMap: Record<string, string> = {
    "violent crime": "violent-crime",
    "violence": "violent-crime",
    "murder": "violent-crime",
    "assault": "violent-crime",
    "robbery": "violent-crime",
    "fraud": "fraud-scams",
    "financial crime": "fraud-scams",
    "scam": "fraud-scams",
    "cyber": "cybercrime",
    "cyber crime": "cybercrime",
    "internet crime": "cybercrime",
    "drugs": "drug-offences",
    "drug": "drug-offences",
    "narcotics": "drug-offences",
    "corruption": "white-collar-crime",
    "politics": "white-collar-crime",
    "political": "white-collar-crime",
    "embezzlement": "white-collar-crime",
    "road": "traffic-offences",
    "traffic": "traffic-offences",
    "accident": "traffic-offences",
    "court": "court-cases",
    "trial": "court-cases",
    "verdict": "court-cases",
    "police": "police-reports",
    "arrest": "police-reports",
    "theft": "property-crime",
    "burglary": "property-crime",
    "property": "property-crime",
    "domestic": "domestic-violence",
    "gang": "organised-crime",
    "syndicate": "organised-crime",
    "organised": "organised-crime",
    "prison": "prison-news",
    "inmate": "prison-news",
    "prevention": "crime-prevention",
    "wanted": "most-wanted",
    "investigation": "investigations",
    "youth": "youth-crime",
    "juvenile": "youth-crime",
    "top": "top-stories",
    "breaking": "top-stories",
  };

  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  return VALID_CATEGORIES.includes(lower.replace(/\s+/g, "-")) 
    ? lower.replace(/\s+/g, "-") 
    : "police-reports";
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 100);
}

function countNumbers(text: string): number {
  const matches = text.match(/\d+(?:,\d{3})*(?:\.\d+)?%?/g);
  return matches ? matches.length : 0;
}

async function findOptimalPublishTime(supabase: any): Promise<Date> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Get articles published today
  const { data: todayArticles } = await supabase
    .from("articles")
    .select("published_at")
    .gte("published_at", today.toISOString())
    .lt("published_at", tomorrow.toISOString())
    .eq("is_published", true);

  const usedHours = new Set<number>();
  if (todayArticles) {
    for (const article of todayArticles) {
      const pubDate = new Date(article.published_at);
      usedHours.add(pubDate.getUTCHours());
    }
  }

  const currentHour = new Date().getUTCHours();
  const currentMinutes = new Date().getUTCMinutes();

  // Find next available peak hour
  for (const hour of PEAK_HOURS) {
    if (hour > currentHour || (hour === currentHour && currentMinutes < 30)) {
      if (!usedHours.has(hour) && (todayArticles?.length || 0) < 4) {
        const publishTime = new Date();
        publishTime.setUTCHours(hour, 0, 0, 0);
        return publishTime;
      }
    }
  }

  // If no peak hours available today, schedule for tomorrow's first peak
  const tomorrowFirst = new Date(tomorrow);
  tomorrowFirst.setUTCHours(PEAK_HOURS[0], 0, 0, 0);
  return tomorrowFirst;
}

// Known acronyms to preserve
const ACRONYMS = new Set([
  "CSA", "GPS", "CID", "BNI", "NIB", "EOCO", "NACOB", "FDA", "GRA",
  "NDC", "NPP", "IGP", "ACP", "DSP", "ASP", "CEO", "MP", "MCE", "DCE",
  "FC", "GFA", "CAF", "FIFA", "UN", "AU", "EU", "US", "USA", "UK",
  "HIV", "COVID", "DNA", "CCTV", "ATM", "SIM", "ID", "TV", "FM",
  "SWAT", "DEA", "FBI", "CIA", "INTERPOL", "ECOWAS", "IMF",
]);

function generateTweet(title: string, _summary: string, _category: string): string {
  let tweet = title.trim();
  
  // Remove filler prefixes
  const fillerPrefixes = [
    /^the ghana police service has\s+/i,
    /^it has been reported that\s+/i,
    /^authorities say that\s+/i,
    /^there has been\s+/i,
    /^reports indicate that\s+/i,
    /^according to reports,?\s+/i,
  ];
  for (const filler of fillerPrefixes) {
    tweet = tweet.replace(filler, "");
  }
  
  // Sentence case: lowercase everything, capitalize first letter, preserve acronyms
  tweet = tweet.toLowerCase().replace(/\b\w+/g, (word, index) => {
    const upper = word.toUpperCase();
    if (ACRONYMS.has(upper)) return upper;
    if (index === 0) return word.charAt(0).toUpperCase() + word.substring(1);
    return word;
  });
  
  // Ensure it ends with a period
  tweet = tweet.replace(/[.!?…]+$/, "").trim() + ".";
  
  // Cap at 150 characters
  if (tweet.length > 150) {
    const cut = tweet.lastIndexOf(" ", 148);
    tweet = tweet.substring(0, cut > 0 ? cut : 148).replace(/[.,;:!?\s]+$/, "") + ".";
  }
  
  return tweet;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin/editor
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "editor"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { content, publishMode, scheduledTime } = await req.json();

    if (!content || content.trim().length < 100) {
      return new Response(
        JSON.stringify({ error: "Content too short (minimum 100 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to structure the article
    const systemPrompt = `You are a professional news editor for GhanaCrimes.com, a Ghanaian crime news website. 
Given raw text or a URL's content, structure it into a proper news article.

Return a JSON object with these exact fields:
{
  "title": "Compelling headline under 100 characters",
  "subtitle": "Brief subtitle expanding on the headline, under 150 characters",
  "summary": "2-3 sentence summary of the key facts, under 200 characters",
  "body": "Full article body with proper paragraphs wrapped in <p> tags.",
  "category": "One of: top-stories, violent-crime, property-crime, cybercrime, fraud-scams, drug-offences, domestic-violence, traffic-offences, youth-crime, organised-crime, white-collar-crime, police-reports, court-cases, prison-news, crime-prevention, crime-statistics, investigations, most-wanted",
  "tags": ["array", "of", "relevant", "tags"],
  "seo_description": "SEO-optimized description under 160 characters"
}

Important:
- Maintain journalistic objectivity
- Use Ghana-specific context and terminology
- Format body text with proper HTML paragraphs
- Respect the presumption of innocence for suspects`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transform this content into a structured news article:\n\n${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to process article with AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;

    if (!responseContent) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let articleData;
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        articleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count numbers for informational purposes only (no longer a requirement)
    const numberCount = countNumbers(articleData.body || "");

    // Determine publish time
    let publishAt: Date;
    const isPublished = publishMode !== "schedule";

    if (publishMode === "now") {
      publishAt = new Date();
    } else if (publishMode === "auto") {
      publishAt = await findOptimalPublishTime(supabase);
    } else if (publishMode === "schedule" && scheduledTime) {
      publishAt = new Date(scheduledTime);
    } else {
      publishAt = new Date();
    }

    // Normalize category
    const normalizedCategory = normalizeCategory(articleData.category || "police-reports");
    const articleSlug = generateSlug(articleData.title);

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("article_slug", articleSlug)
      .single();

    const finalSlug = existing 
      ? `${articleSlug}-${Date.now().toString(36)}` 
      : articleSlug;

    // Insert article
    const { data: article, error: insertError } = await supabase
      .from("articles")
      .insert({
        title: articleData.title,
        subtitle: articleData.subtitle || null,
        summary: articleData.summary,
        body: articleData.body,
        category_slug: normalizedCategory,
        article_slug: finalSlug,
        author_name: "GhanaCrimes Desk",
        author_id: user.id,
        tags: articleData.tags || [],
        seo_title: articleData.title,
        seo_description: articleData.seo_description || articleData.summary,
        is_published: isPublished,
        published_at: isPublished ? publishAt.toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save article" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate tweet
    const suggestedTweet = generateTweet(articleData.title, articleData.summary, normalizedCategory);

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: article.id,
          title: article.title,
          slug: finalSlug,
          category: normalizedCategory,
          url: `/${normalizedCategory}/${finalSlug}`,
          publishedAt: publishAt.toISOString(),
          isPublished,
        },
        suggestedTweet,
        numberCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in manual-article-submit:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
