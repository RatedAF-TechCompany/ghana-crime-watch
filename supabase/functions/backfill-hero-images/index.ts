// Backfill safely re-hosted source images for the most recent published articles.
// POST body (all optional): { days?: number, limit?: number, latest?: boolean, dry_run?: boolean }
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
  const latest = body.latest !== false;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("articles")
    .select("id, article_slug, hero_image, source_url, published_at")
    .eq("is_published", true)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (!latest) query = query.is("hero_image", null);
  const { data: rows, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  let updated = 0;

  const processRow = async (row: any) => {
    if (!row.source_url) {
      results.push({ id: row.id, skipped: "no_source_url" });
      return;
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
  };

  // Small concurrent batches keep the request bounded without hammering publishers.
  const work = rows || [];
  for (let i = 0; i < work.length; i += 5) {
    await Promise.all(work.slice(i, i + 5).map(processRow));
  }

  return new Response(JSON.stringify({
    scanned: rows?.length || 0,
    updated,
    dry_run: dryRun,
    days,
    results,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
