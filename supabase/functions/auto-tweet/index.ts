import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OAuth 1.0a HMAC-SHA1 implementation for X/Twitter API
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

async function createOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // CRITICAL: Do NOT include POST body parameters when creating the signature
  // for requests with JSON body (Content-Type: application/json)
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  oauthParams["oauth_signature"] = signature;

  const headerString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerString}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id } = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: "article_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");
    const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
    const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");

    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new Error("Twitter API credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Rate limit: max 1 tweet every 3 hours ---
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data: recentTweets } = await supabase
      .from("articles")
      .select("id, twitter_post, published_at")
      .like("twitter_post", "POSTED:%")
      .gte("updated_at", threeHoursAgo)
      .limit(1);

    if (recentTweets && recentTweets.length > 0) {
      console.log("Rate limited: a tweet was posted within the last 3 hours");
      return new Response(
        JSON.stringify({ error: "Rate limited: only 1 tweet allowed every 3 hours", rate_limited: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the article
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, summary, twitter_post, category_slug, article_slug, is_published, source_published_at, published_at")
      .eq("id", article_id)
      .single();

    if (fetchError || !article) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GATE 5: skip tweeting if source is older than 3 hours
    const sourceTs = article.source_published_at ? new Date(article.source_published_at).getTime() : null;
    if (sourceTs !== null && !isNaN(sourceTs)) {
      const ageHours = (Date.now() - sourceTs) / (1000 * 60 * 60);
      if (ageHours > 3) {
        console.log(`SKIPPED_STALE_SOURCE: article ${article_id} source is ${ageHours.toFixed(1)}h old`);
        return new Response(
          JSON.stringify({ error: "SKIPPED_STALE_SOURCE", stale: true, age_hours: ageHours }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if already posted
    if (article.twitter_post?.startsWith("POSTED:")) {
      return new Response(
        JSON.stringify({ error: "Already tweeted", already_posted: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Count total posted tweets to determine if this is the 6th ---
    const { count: totalPosted } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .like("twitter_post", "POSTED:%");

    const isUrlTweet = totalPosted !== null && (totalPosted % 3 === 2); // 0-indexed: every 3rd tweet includes URL

    // Build article URL
    const articleUrl = `https://ghana-crime-watch.lovable.app/${article.category_slug}/${article.article_slug}`;

    // Build tweet text — use AI to craft engaging, shareable crime tweet
    const rawText = article.twitter_post || article.title;
    const summary = article.summary || "";

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let tweetText = rawText;

    if (lovableApiKey) {
      try {
        const rewriteResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
            content: `You are the social media editor for GhanaCrimes (@ghanacrimes on X).

Given this crime news headline and summary, write ONE factual news tweet for the GhanaCrimes audience.

HEADLINE: "${rawText}"
SUMMARY: "${summary}"

RULES (HARD):
- Use present perfect tense ("Police have arrested...", "A court has sentenced...", "Authorities have charged...").
- Always include attribution: police, court, authorities, Ghana Police Service, EOCO, CID, Accra Circuit Court, etc.
- Maximum 2 sentences. State only verified facts from the source. No invented details.
- Use precise figures where available (GH₵ amounts, years sentenced, number of suspects, victims).
- Never speculate on guilt. Never state guilt as fact before conviction. Use "alleged", "accused", "suspected" where appropriate.
- Zero opinion, zero commentary, zero emotion, zero sensationalism.
- No hashtags. No emojis. No links. No "BREAKING:" prefix.
- No em dashes or en dashes. Use commas or periods instead.
- End with a clean full stop.
- UK/Ghana English spelling.
- NEVER exceed 200 characters. Target 150-195 characters.

Return ONLY the tweet text, nothing else.`
            }],
            temperature: 0.3,
            max_tokens: 180,
          }),
        });

        if (rewriteResponse.ok) {
          const aiData = await rewriteResponse.json();
          const rewritten = aiData.choices?.[0]?.message?.content?.trim();
          if (rewritten && rewritten.length > 20 && rewritten.length <= 200) {
            tweetText = rewritten
              .replace(/^["']|["']$/g, "")
              .replace(/^BREAKING:\s*/i, "")
              .replace(/[\u2014\u2013\u2012]/g, ",")
              .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}]/gu, "")
              .trim();
            console.log(`AI rewrote tweet: "${rawText}" → "${tweetText}"`);
          } else {
            console.log(`AI rewrite rejected (length: ${rewritten?.length}), using fallback`);
          }
        }
      } catch (aiErr) {
        console.error("AI rewrite failed, using fallback:", aiErr);
      }
    }

    // Fallback: basic cleanup if AI didn't run
    if (tweetText === rawText) {
      tweetText = tweetText
        .replace(/^BREAKING:\s*/i, "")
        .replace(/[\u2014\u2013\u2012]/g, ",")
        .replace(/[.!?…]+$/, "")
        .trim() + ".";
      tweetText = tweetText.charAt(0).toUpperCase() + tweetText.slice(1);
    }

    // Strip emojis, dashes, any leftover BREAKING: prefix; cap at 200
    tweetText = tweetText
      .replace(/^BREAKING:\s*/i, "")
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}]/gu, "")
      .replace(/[\u2014\u2013\u2012]/g, ",")
      .trim();
    if (tweetText.length > 200) {
      const cut = tweetText.lastIndexOf(" ", 198);
      tweetText = tweetText.substring(0, cut > 0 ? cut : 198).replace(/[.,;:!?\s]+$/, "") + ".";
    }

    if (isUrlTweet) {
      tweetText = `${tweetText}\n${articleUrl}`;
    }

    const finalTweet = tweetText;

    console.log(`Posting tweet for article ${article_id}: ${finalTweet.substring(0, 50)}...`);

    // Post to X/Twitter
    const twitterUrl = "https://api.x.com/2/tweets";
    const authHeader = await createOAuthHeader(
      "POST",
      twitterUrl,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret
    );

    const twitterResponse = await fetch(twitterUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: finalTweet }),
    });

    if (!twitterResponse.ok) {
      const errorBody = await twitterResponse.text();
      console.error("Twitter API error:", twitterResponse.status, errorBody);
      throw new Error(`Twitter API error: ${twitterResponse.status} - ${errorBody}`);
    }

    const tweetData = await twitterResponse.json();
    const tweetId = tweetData.data?.id;

    console.log(`Tweet posted successfully: ${tweetId}`);

    // Mark as posted by prefixing twitter_post field
    const originalText = article.twitter_post || article.title.substring(0, 200);
    await supabase
      .from("articles")
      .update({ twitter_post: `POSTED:${tweetId}|${originalText}` })
      .eq("id", article_id);

    return new Response(
      JSON.stringify({
        success: true,
        tweet_id: tweetId,
        tweet_url: `https://x.com/i/status/${tweetId}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-tweet error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
