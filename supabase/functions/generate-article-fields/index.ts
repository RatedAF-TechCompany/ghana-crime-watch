import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Article Body:\n${plainText}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate article fields");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON response
    let fields;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fields = JSON.parse(jsonMatch[0]);
      } else {
        fields = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
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
