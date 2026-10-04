'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';

const db = supabase as any;
const strip = (h: string) => (h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Words in the draft that do not appear in the source are highlighted for the editor. */
function DraftDiff({ draft, source }: { draft: string; source: string }) {
  const src = source.toLowerCase();
  return (
    <p className="text-sm leading-relaxed">
      {draft.split(/(\s+)/).map((w, i) => {
        const k = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        const novel = k.length > 3 && !src.includes(k);
        return <span key={i} className={novel ? 'bg-destructive/15 text-destructive' : undefined}>{w}</span>;
      })}
    </p>
  );
}

export default function ReviewQueueView() {
  const router = useRouter();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [raw, setRaw] = useState<Record<string, any>>({});
  const [rejected, setRejected] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [backfill, setBackfill] = useState<any>(null);
  const [autoOn, setAutoOn] = useState(true);
  const [cap, setCap] = useState(20);
  const [busy, setBusy] = useState('');
  const [correction, setCorrection] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const r = (roles || []).map((x: any) => x.role);
      if (!r.includes('admin') && !r.includes('editor')) { router.push('/admin'); return; }
      setIsAdmin(r.includes('admin'));
      await load();
      setReady(true);
    })();
  }, []);

  const load = async () => {
    const [{ data: q }, { data: rj }, { data: au }, { data: pr }, { data: bf }, { data: st }] = await Promise.all([
      db.from('articles').select('id,title,summary,body,category_slug,article_slug,status,source_url,source_urls,gate_report,region,offence_type,case_status,created_at').in('status', ['review', 'approved']).order('created_at', { ascending: false }).limit(100),
      db.from('raw_items').select('id,title,url,reason,fetched_at,summary').eq('status', 'rejected').order('fetched_at', { ascending: false }).limit(100),
      db.from('audit_logs').select('id,action,resource_id,details,created_at').order('created_at', { ascending: false }).limit(100),
      db.from('pipeline_runs').select('id,started_at,status,stats').eq('kind', 'ingest').order('started_at', { ascending: false }).limit(10),
      db.from('pipeline_runs').select('id,started_at,stats').eq('kind', 'backfill').order('started_at', { ascending: false }).limit(1),
      db.from('site_settings').select('key,value').in('key', ['auto_publish_enabled', 'auto_publish_daily_cap']),
    ]);
    setQueue(q || []);
    setRejected(rj || []);
    setAudit(au || []);
    setRuns(pr || []);
    setBackfill(bf?.[0] || null);
    for (const s of st || []) {
      if (s.key === 'auto_publish_enabled') setAutoOn(s.value !== false);
      if (s.key === 'auto_publish_daily_cap') setCap(Number(s.value));
    }
    const ids = (q || []).map((a: any) => a.gate_report?.raw_item_id).filter(Boolean);
    if (ids.length) {
      const { data: ri } = await db.from('raw_items').select('id,title,summary,url').in('id', ids);
      setRaw(Object.fromEntries((ri || []).map((x: any) => [x.id, x])));
    }
  };

  const log = (action: string, id: string, details: any = {}) => db.rpc('create_audit_log', { _action: action, _resource_type: 'article', _resource_id: id, _details: details });

  const setStatus = async (a: any, status: string) => {
    setBusy(a.id);
    const { error } = await db.from('articles').update({ status }).eq('id', a.id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else { await log(`review_${status}`, a.id); toast({ title: `Marked ${status}` }); await load(); }
    setBusy('');
  };

  const addCorrection = async (a: any) => {
    const note = (correction[a.id] || '').trim();
    if (!note) return;
    const { error } = await db.from('corrections').insert({ article_id: a.id, note });
    if (error) toast({ title: 'Could not save correction', description: error.message, variant: 'destructive' });
    else { await log('correction_added', a.id, { note }); setCorrection({ ...correction, [a.id]: '' }); toast({ title: 'Correction saved' }); }
  };

  const saveSettings = async (on: boolean, c: number) => {
    setAutoOn(on); setCap(c);
    await db.from('site_settings').update({ value: on }).eq('key', 'auto_publish_enabled');
    await db.from('site_settings').update({ value: c }).eq('key', 'auto_publish_daily_cap');
    toast({ title: 'Auto-publish settings saved' });
  };

  const invoke = async (fn: string) => {
    setBusy(fn);
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    setBusy('');
    if (error) toast({ title: `${fn} failed`, description: error.message, variant: 'destructive' });
    else toast({ title: `${fn} finished`, description: JSON.stringify(data?.stats || data).slice(0, 200) });
    await load();
  };

  const downloadCsv = () => {
    const rows = backfill?.stats?.rows || [];
    const cols = ['id', 'title', 'url', 'published_at', 'action', 'hard_fails', 'soft_flags'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((r: any) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'gate-backfill-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) return <div className="p-8 font-sans text-sm text-muted-foreground">Loading review queue...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 font-sans md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}><ArrowLeft className="mr-1 h-4 w-4" />Admin</Button>
          <h1 className="font-serif text-2xl font-bold">Editorial review</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">Auto-publish <Switch checked={autoOn} disabled={!isAdmin} onCheckedChange={(v) => saveSettings(v, cap)} /></label>
          <label className="flex items-center gap-2 text-sm">Daily cap
            <Input type="number" className="h-8 w-20" value={cap} disabled={!isAdmin} onChange={(e) => setCap(Number(e.target.value))} onBlur={() => saveSettings(autoOn, cap)} />
          </label>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => invoke('source-ingest')}><Play className="mr-1 h-4 w-4" />Run pipeline</Button>
        </div>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          <TabsTrigger value="runs">Pipeline runs</TabsTrigger>
          <TabsTrigger value="backfill">Backfill</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {queue.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>}
          {queue.map((a) => {
            const g = a.gate_report || {};
            const r = raw[g.raw_item_id];
            const sourceText = r ? `${r.title}. ${r.summary || ''}` : '';
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{a.status}</Badge>
                    {a.offence_type && <Badge variant="secondary">{a.offence_type}</Badge>}
                    {a.region && <Badge variant="secondary">{a.region}</Badge>}
                    <span className="text-xs text-muted-foreground">{g.source} (tier {g.source_tier}) · {g.corroborating_sources ?? 0} other sources · {getRelativeTime(a.created_at)}</span>
                  </div>
                  <CardTitle className="font-serif text-lg">{a.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {(g.soft_flags || []).map((f: string) => <Badge key={f} className="bg-accent text-accent-foreground">{f}</Badge>)}
                    {g.held_reason && <Badge variant="outline">{g.held_reason}</Badge>}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded border border-border p-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Source (stored excerpt)</p>
                      <p className="text-sm">{sourceText || 'Excerpt unavailable'}</p>
                      {(a.source_urls?.length ? a.source_urls : [a.source_url]).filter(Boolean).map((u: string) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block break-all text-xs text-primary underline">{u}</a>
                      ))}
                    </div>
                    <div className="rounded border border-border p-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Draft (words not in excerpt highlighted)</p>
                      <DraftDiff draft={strip(a.body)} source={sourceText} />
                    </div>
                  </div>
                  <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Full gate report</summary><pre className="mt-2 overflow-auto rounded bg-muted p-2">{JSON.stringify(g, null, 2)}</pre></details>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy === a.id} onClick={() => setStatus(a, 'published')}>Publish</Button>
                    {a.status !== 'approved' && <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a, 'approved')}>Approve</Button>}
                    <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a, 'rejected')}>Reject</Button>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/articles/${a.id}`)}>Edit</Button>
                  </div>
                  <div className="flex gap-2">
                    <Textarea rows={1} placeholder="Correction note (shown on the article)" value={correction[a.id] || ''} onChange={(e) => setCorrection({ ...correction, [a.id]: e.target.value })} />
                    <Button size="sm" variant="outline" onClick={() => addCorrection(a)}>Add correction</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-2">
          {rejected.map((r) => (
            <div key={r.id} className="rounded border border-border p-3 text-sm">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{r.title}</a>
              <p className="text-xs text-destructive">{r.reason}</p>
              <p className="text-xs text-muted-foreground">{getRelativeTime(r.fetched_at)}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="runs">
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(runs, null, 2)}</pre>
        </TabsContent>

        <TabsContent value="backfill" className="space-y-3">
          <p className="text-sm">Checks published stories from the last 30 days. Hard fails are moved to draft, never deleted.</p>
          <div className="flex gap-2">
            {isAdmin && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => invoke('gate-backfill')}>Run backfill</Button>}
            <Button size="sm" variant="outline" disabled={!backfill} onClick={downloadCsv}><Download className="mr-1 h-4 w-4" />Download CSV</Button>
          </div>
          {backfill && (
            <p className="text-sm text-muted-foreground">
              Last run {getRelativeTime(backfill.started_at)}: {backfill.stats.unpublished} set to draft, {backfill.stats.flagged_rows} flagged in total.
            </p>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-1">
          {audit.map((l) => (
            <div key={l.id} className="flex gap-3 border-b border-border py-1 text-xs">
              <span className="w-28 shrink-0 text-muted-foreground">{getRelativeTime(l.created_at)}</span>
              <span className="w-40 shrink-0 font-semibold">{l.action}</span>
              <span className="truncate text-muted-foreground">{l.resource_id} {l.details ? JSON.stringify(l.details) : ''}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
