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

    // Fetch the article
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, twitter_post, category_slug, article_slug, is_published")
      .eq("id", article_id)
      .single();

    if (fetchError || !article) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already posted
    if (article.twitter_post?.startsWith("POSTED:")) {
      return new Response(
        JSON.stringify({ error: "Already tweeted", already_posted: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build tweet text — no URL, max 170 characters
    let tweetText = article.twitter_post || article.title;
    if (tweetText.length > 170) {
      tweetText = tweetText.substring(0, 167) + "...";
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
