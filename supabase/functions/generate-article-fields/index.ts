import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callGateway, parseJson, newUsage, AiCreditError } from "../_shared/ai-usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { body } = await req.json();

    if (!body) {
      return new Response(
        JSON.stringify({ error: "Article body is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Strip HTML tags for cleaner text analysis
    const plainText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const systemPrompt = `You are the GhanaCrimes publishing assistant inside an admin page.

Input fields
Article Body as a single text block pasted by the editor.

On Generate, you must automatically fill these fields from the Article Body.

Title
Extract or generate a compelling news headline from the article. Keep it concise and factual.

Subtitle
Generate a brief secondary headline that adds context to the title. Optional but recommended.

Summary
Write a 2-3 sentence summary of the article capturing the key facts. Keep it under 300 characters.

Slug
Create a short SEO friendly slug in lowercase with hyphens only. No dates unless essential. No stop words where possible.

Author
Always set to GhanaCrimes Desk.

Section
Always set to Crime And Investigation.

Category
Always set to Public Order.

Tags
Generate 5 to 10 comma separated tags based strictly on the Article Body. Include places organisations and key topics. No hashtags. No duplicates.

SEO Description
Write one plain English sentence under 160 characters summarising the Article Body. Neutral tone. No hype. No speculation. No links.

Output requirements
Return a single JSON object with exactly these keys.

title
subtitle
summary
slug
author
section
category
tags
seo_description

tags must be an array of strings.

Do not output anything outside the JSON.

Example output
{
"title": "Police Investigate Attempted Palace Takeover in Boadua",
"subtitle": "Incident linked to ongoing chieftaincy dispute in Eastern Region",
"summary": "Ghana Police Service is investigating an attempted takeover of a palace in Boadua. The incident is connected to a chieftaincy dispute in the Eastern Region.",
"slug": "police-investigate-palace-incident-boadua",
"author": "GhanaCrimes Desk",
"section": "Crime And Investigation",
"category": "Public Order",
"tags": ["Boadua", "Chieftaincy dispute", "Ghana Police Service", "Palace", "Eastern Region"],
"seo_description": "Police are investigating an attempted takeover of a palace in Boadua linked to a chieftaincy dispute."
}`;

    const usage = newUsage();
    let fields;
    try {
      const { content } = await callGateway(LOVABLE_API_KEY, usage, {
        system: systemPrompt,
        user: `Article Body:\n${plainText}`,
        max_tokens: 400,
        temperature: 0.2,
        json: true,
      });
      if (!content) throw new Error("No content returned from AI");
      fields = parseJson(content);
    } catch (e) {
      if (e instanceof AiCreditError) {
        const status = e.status === 402 ? 402 : 429;
        return new Response(
          JSON.stringify({ error: e.message }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("generate-article-fields error:", e);
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "Failed to generate article fields" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    console.log("Generated fields:", fields);

    return new Response(
      JSON.stringify({ success: true, fields }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating article fields:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
