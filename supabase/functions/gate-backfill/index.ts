// Runs the deterministic editorial gate over published articles from the last 30 days.
// Hard fails are set to draft (never deleted). Results are stored for the admin CSV report.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { runBackfillGate } from "../_shared/editorial-gate.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await supabase.auth.getUser(token);
  if (!u?.user) return json({ error: "unauthorized" }, 401);
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles || []).some((r: any) => r.role === "admin")) return json({ error: "admin only" }, 403);

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const rows: any[] = [];
  let unpublished = 0;
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("articles")
      .select("id,title,body,source_url,source_urls,category_slug,article_slug,published_at,gate_report")
      .eq("is_published", true).gte("published_at", since).order("published_at", { ascending: false }).range(from, from + 499);
    if (error) return json({ error: error.message }, 500);
    if (!data?.length) break;
    for (const a of data) {
      const g = runBackfillGate(a as any);
      const fail = g.hard_fails.length > 0;
      if (fail) {
        await supabase.from("articles").update({ status: "draft", gate_report: { ...(a.gate_report || {}), backfill: { ...g, checked_at: new Date().toISOString() } } }).eq("id", a.id);
        await supabase.from("audit_logs").insert({ user_id: u.user.id, action: "backfill_unpublished", resource_type: "article", resource_id: a.id, details: g });
        unpublished++;
      }
      if (fail || g.soft_flags.length) {
        rows.push({ id: a.id, title: a.title, url: `/${a.category_slug}/${a.article_slug}`, published_at: a.published_at, action: fail ? "set_to_draft" : "kept_live", hard_fails: g.hard_fails.join("; "), soft_flags: g.soft_flags.join("; ") });
      }
    }
    if (data.length < 500) break;
  }
  const { count: checked } = await supabase.from("articles").select("id", { count: "exact", head: true }).gte("published_at", since);
  const stats = { checked_window_total: checked, unpublished, flagged_rows: rows.length };
  await supabase.from("pipeline_runs").insert({ kind: "backfill", status: "ok", finished_at: new Date().toISOString(), stats: { ...stats, rows } });
  return json({ ok: true, ...stats });
});
