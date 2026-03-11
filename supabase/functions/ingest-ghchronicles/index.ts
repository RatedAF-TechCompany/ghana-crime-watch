import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE_USERNAME = "_GhChronicles";
const SOURCE_LABEL = "GhChronicles";

const CRIME_KEYWORDS = [
  "arrest", "police", "court", "murder", "robbery", "assault", "fraud",
  "theft", "investigation", "corrupt", "violence", "suspect", "charge",
  "jail", "prison", "shooting", "stabbing", "kidnap", "armed", "seized",
  "drug", "narcotics", "bail", "remand", "convict", "sentenced",
  "cybercrime", "scam", "galamsey", "smuggl", "rape", "abuse",
  "manslaughter", "accident", "deploy", "military", "soldier",
  "crime", "criminal", "offence", "offense", "victim", "dead", "killed",
  "gang", "wanted", "manhunt", "operation", "crackdown", "fire",
];

const IGNORE_KEYWORDS = [
  "opinion:", "my take", "i think", "entertainment", "music video",
  "happy birthday", "congratulations", "good morning", "lol", "😂",
];

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21").replace(/\*/g, "%2A")
    .replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  return nonce;
}

async function createOAuthHeader(
  method: string, url: string, params: Record<string, string>,
  consumerKey: string, consumerSecret: string,
  accessToken: string, accessTokenSecret: string
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

  const allParams = { ...oauthParams, ...params };
  const sortedParams = Object.keys(allParams).sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  oauthParams["oauth_signature"] = signature;
  return `OAuth ${Object.keys(oauthParams).sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ")}`;
}

function isCrimeRelated(text: string): boolean {
  const lower = text.toLowerCase();
  for (const ignore of IGNORE_KEYWORDS) {
    if (lower.includes(ignore)) return false;
  }
  return CRIME_KEYWORDS.some((kw) => lower.includes(kw));
}

const ACRONYMS = new Set([
  "CSA", "GPS", "CID", "BNI", "NIB", "EOCO", "NACOB", "FDA", "GRA",
  "NDC", "NPP", "IGP", "ACP", "DSP", "ASP", "CEO", "MP", "MCE", "DCE",
  "FC", "GFA", "CAF", "FIFA", "UN", "AU", "EU", "US", "USA", "UK",
  "HIV", "COVID", "DNA", "CCTV", "ATM", "SIM", "ID", "TV", "FM",
  "SWAT", "DEA", "FBI", "CIA", "INTERPOL", "ECOWAS", "IMF",
]);

function sentenceCaseWithAcronyms(text: string): string {
  return text.toLowerCase().replace(/\b\w+/g, (word, index) => {
    const upper = word.toUpperCase();
    if (ACRONYMS.has(upper)) return upper;
    if (index === 0) return word.charAt(0).toUpperCase() + word.substring(1);
    return word;
  });
}

function generateTweetText(title: string): string {
  let tweet = title.trim();
  const fillers = [
    /^the ghana police service has\s+/i,
    /^it has been reported that\s+/i,
    /^authorities say that\s+/i,
    /^there has been\s+/i,
    /^reports indicate that\s+/i,
  ];
  for (const f of fillers) tweet = tweet.replace(f, "");
  // Sentence case with acronym preservation
  tweet = sentenceCaseWithAcronyms(tweet);
  tweet = tweet.replace(/[.!?…]+$/, "").trim() + ".";
  if (tweet.length > 150) {
    const cut = tweet.lastIndexOf(" ", 148);
    tweet = tweet.substring(0, cut > 0 ? cut : 148).replace(/[.,;:!?\s]+$/, "") + ".";
  }
  return tweet;
}

async function postTweetDirectly(
  tweetText: string,
  consumerKey: string, consumerSecret: string,
  accessToken: string, accessTokenSecret: string
): Promise<string | null> {
  const twitterUrl = "https://api.x.com/2/tweets";
  const authHeader = await createOAuthHeader(
    "POST", twitterUrl, {},
    consumerKey, consumerSecret, accessToken, accessTokenSecret
  );

  const res = await fetch(twitterUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: tweetText }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Tweet post failed:", res.status, errText);
    return null;
  }

  const data = await res.json();
  return data.data?.id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET")!;
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN")!;
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const log = async (eventType: string, details: Record<string, unknown>) => {
    await supabase.from("ingestion_logs").insert({
      source: "ghchronicles",
      event_type: eventType,
      details,
    });
  };

  try {
    // Step 1: Get user ID
    const userLookupUrl = "https://api.x.com/2/users/by/username/" + SOURCE_USERNAME;
    const userAuthHeader = await createOAuthHeader(
      "GET", userLookupUrl, {},
      consumerKey, consumerSecret, accessToken, accessTokenSecret
    );

    const userRes = await fetch(userLookupUrl, {
      headers: { Authorization: userAuthHeader },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("User lookup failed:", userRes.status, errText);
      await log("error", { step: "user_lookup", status: userRes.status, error: errText });
      return new Response(JSON.stringify({ error: "User lookup failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) {
      await log("error", { step: "user_lookup", error: "No user ID found" });
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Fetch recent tweets
    const tweetsUrl = `https://api.x.com/2/users/${userId}/tweets`;
    const tweetParams: Record<string, string> = {
      "max_results": "10",
      "tweet.fields": "created_at,attachments,text",
      "expansions": "attachments.media_keys",
      "media.fields": "url,preview_image_url,type",
      "exclude": "retweets,replies",
    };

    const tweetsAuthHeader = await createOAuthHeader(
      "GET", tweetsUrl, tweetParams,
      consumerKey, consumerSecret, accessToken, accessTokenSecret
    );

    const queryString = Object.entries(tweetParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const tweetsRes = await fetch(`${tweetsUrl}?${queryString}`, {
      headers: { Authorization: tweetsAuthHeader },
    });

    if (!tweetsRes.ok) {
      const errText = await tweetsRes.text();
      console.error("Tweets fetch failed:", tweetsRes.status, errText);
      await log("error", { step: "fetch_tweets", status: tweetsRes.status, error: errText });
      return new Response(JSON.stringify({ error: "Failed to fetch tweets" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tweetsData = await tweetsRes.json();
    const tweets = tweetsData.data || [];
    const mediaMap: Record<string, string> = {};

    if (tweetsData.includes?.media) {
      for (const m of tweetsData.includes.media) {
        if (m.media_key) {
          mediaMap[m.media_key] = m.url || m.preview_image_url || "";
        }
      }
    }

    console.log(`Fetched ${tweets.length} tweets from @${SOURCE_USERNAME}`);

    // Step 3: Filter already-processed tweets
    const tweetIds = tweets.map((t: any) => t.id);
    const { data: existing } = await supabase
      .from("processed_tweets")
      .select("tweet_id")
      .in("tweet_id", tweetIds);

    const processedSet = new Set((existing || []).map((e: any) => e.tweet_id));
    const newTweets = tweets.filter((t: any) => !processedSet.has(t.id));

    console.log(`${newTweets.length} new tweets to process`);

    if (newTweets.length === 0) {
      await log("poll", { tweets_found: tweets.length, new_tweets: 0 });
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const tweet of newTweets) {
      const tweetText = tweet.text || "";
      const tweetId = tweet.id;

      const tweetMediaUrls: string[] = [];
      if (tweet.attachments?.media_keys) {
        for (const mk of tweet.attachments.media_keys) {
          if (mediaMap[mk]) tweetMediaUrls.push(mediaMap[mk]);
        }
      }

      await supabase.from("processed_tweets").insert({
        tweet_id: tweetId,
        author_username: SOURCE_USERNAME,
        tweet_text: tweetText,
        tweet_created_at: tweet.created_at,
        tweet_media_urls: tweetMediaUrls,
        processing_status: "pending",
      });

      if (!isCrimeRelated(tweetText)) {
        await supabase.from("processed_tweets")
          .update({ processing_status: "skipped_not_crime" })
          .eq("tweet_id", tweetId);
        await log("skipped", { tweet_id: tweetId, reason: "not_crime_related" });
        continue;
      }

      if (!lovableApiKey) {
        await supabase.from("processed_tweets")
          .update({ processing_status: "failed", error_message: "AI not configured" })
          .eq("tweet_id", tweetId);
        continue;
      }

      try {
        const aiPrompt = `You are a professional news editor for GhanaCrimes.com. Convert this tweet from GhChronicles (@_GhChronicles) into a short crime news article.

Tweet: "${tweetText}"

Return a JSON object:
{
  "headline": "Compelling headline under 100 chars, hook-style: Authority/Number/Event + Action + Subject + Location",
  "body": "<p>Short intro paragraph with key facts.</p><p>Details paragraph with context.</p><p><em>Source: GhChronicles</em></p>",
  "summary": "2-3 sentence summary under 200 chars",
  "category": "One of: top-stories, violent-crime, property-crime, cybercrime, fraud-scams, drug-offences, domestic-violence, traffic-offences, youth-crime, organised-crime, white-collar-crime, police-reports, court-cases, prison-news, crime-prevention, investigations, most-wanted",
  "tags": ["crime", "police", "ghana", ...other relevant tags],
  "seo_description": "SEO description under 160 chars"
}

Rules:
- Maintain journalistic objectivity
- Use Ghana-specific context
- Respect presumption of innocence
- Source attribution must say "GhChronicles"
- Headline must follow HOOK + ACTION + CRIME/EVENT + LOCATION pattern`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          await supabase.from("processed_tweets")
            .update({ processing_status: "failed", error_message: `AI error: ${aiResponse.status}` })
            .eq("tweet_id", tweetId);
          await log("error", { tweet_id: tweetId, step: "ai_generate", error: errText });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) {
          await supabase.from("processed_tweets")
            .update({ processing_status: "failed", error_message: "Empty AI response" })
            .eq("tweet_id", tweetId);
          continue;
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          await supabase.from("processed_tweets")
            .update({ processing_status: "failed", error_message: "No JSON in AI response" })
            .eq("tweet_id", tweetId);
          continue;
        }

        const articleData = JSON.parse(jsonMatch[0]);

        const articleSlug = articleData.headline
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 100);

        const { data: existingSlug } = await supabase
          .from("articles")
          .select("id")
          .eq("article_slug", articleSlug)
          .single();

        const finalSlug = existingSlug
          ? `${articleSlug}-${Date.now().toString(36)}`
          : articleSlug;

        const validCategories = [
          "top-stories", "violent-crime", "property-crime", "cybercrime", "fraud-scams",
          "drug-offences", "domestic-violence", "traffic-offences", "youth-crime",
          "organised-crime", "white-collar-crime", "police-reports", "court-cases",
          "prison-news", "crime-prevention", "investigations", "most-wanted",
        ];
        const category = validCategories.includes(articleData.category)
          ? articleData.category
          : "police-reports";

        const gcTweet = generateTweetText(articleData.headline);
        const heroImage = tweetMediaUrls.length > 0 ? tweetMediaUrls[0] : null;

        const { data: article, error: insertErr } = await supabase
          .from("articles")
          .insert({
            title: articleData.headline,
            subtitle: null,
            summary: articleData.summary || articleData.headline,
            body: articleData.body,
            category_slug: category,
            article_slug: finalSlug,
            author_name: SOURCE_LABEL,
            tags: articleData.tags || ["crime", "police", "ghana"],
            seo_title: articleData.headline,
            seo_description: articleData.seo_description || articleData.summary,
            hero_image: heroImage,
            is_published: true,
            published_at: new Date().toISOString(),
            twitter_post: gcTweet,
          })
          .select("id")
          .single();

        if (insertErr || !article) {
          await supabase.from("processed_tweets")
            .update({ processing_status: "failed", error_message: insertErr?.message || "Insert failed" })
            .eq("tweet_id", tweetId);
          await log("error", { tweet_id: tweetId, step: "insert_article", error: insertErr?.message });
          continue;
        }

        await supabase.from("processed_tweets")
          .update({
            processing_status: "published",
            generated_article_id: article.id,
          })
          .eq("tweet_id", tweetId);

        await log("published", {
          tweet_id: tweetId,
          article_id: article.id,
          headline: articleData.headline,
        });

        // Post tweet immediately
        try {
          const postedTweetId = await postTweetDirectly(
            gcTweet, consumerKey, consumerSecret, accessToken, accessTokenSecret
          );
          if (postedTweetId) {
            await supabase.from("articles")
              .update({ twitter_post: `POSTED:${postedTweetId}|${gcTweet}` })
              .eq("id", article.id);
            console.log(`Tweet posted for article ${article.id}: ${postedTweetId}`);
          } else {
            console.error("Tweet post returned no ID for article:", article.id);
          }
        } catch (tweetErr) {
          console.error("Direct tweet failed:", tweetErr);
        }

        processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        await supabase.from("processed_tweets")
          .update({ processing_status: "failed", error_message: errMsg })
          .eq("tweet_id", tweetId);
        await log("error", { tweet_id: tweetId, step: "processing", error: errMsg });
      }
    }

    await log("poll_complete", {
      tweets_found: tweets.length,
      new_tweets: newTweets.length,
      articles_published: processed,
    });

    return new Response(
      JSON.stringify({ success: true, processed, total_new: newTweets.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("GhChronicles ingestion error:", errMsg);
    await log("fatal_error", { error: errMsg });
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
