// Backfill hero_image for existing articles where it is null.
// POST body (all optional): { days?: number, limit?: number, dry_run?: boolean }
// Uses the shared extractor — no AI, no new API keys.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractHeroImage } from "../_shared/extract-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }
  const days = Number.isFinite(body.days) ? body.days : 30;
  const limit = Math.min(Number.isFinite(body.limit) ? body.limit : 100, 500);
  const dryRun = !!body.dry_run;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("articles")
    .select("id, article_slug, hero_image, source_url, published_at")
    .is("hero_image", null)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  let updated = 0;

  for (const row of rows || []) {
    if (!row.source_url) {
      results.push({ id: row.id, skipped: "no_source_url" });
      continue;
    }
    try {
      const r = await extractHeroImage(
        { articleUrl: row.source_url },
        row.article_slug || row.id,
        supabase,
      );
      if (r.url) {
        if (!dryRun) {
          await supabase.from("articles").update({ hero_image: r.url }).eq("id", row.id);
        }
        updated++;
        results.push({ id: row.id, url: r.url, source: r.source });
      } else {
        results.push({ id: row.id, skipped: "no_image_found" });
      }
    } catch (e) {
      results.push({ id: row.id, error: e instanceof Error ? e.message : "unknown" });
    }
    // polite pacing
    await new Promise((res) => setTimeout(res, 250));
  }

  return new Response(JSON.stringify({
    scanned: rows?.length || 0,
    updated,
    dry_run: dryRun,
    days,
    results,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
