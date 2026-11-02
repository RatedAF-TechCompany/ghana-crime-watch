'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';

/**
 * One moderation queue. Access: AdminGate (Supabase Auth session + user_roles) and RLS
 * (has_role admin/editor) — the anon key cannot read or change any of this.
 * Nothing is deleted: rejecting a comment stamps rejected_at; rejecting a Fraud Watch account sets status Cleared.
 */
type Tab = 'comments' | 'fraud' | 'reports' | 'tips';
const db = supabase as any;

export default function ModerationView() {
  const [tab, setTab] = useState<Tab>('comments');
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const q = tab === 'comments'
      ? db.from('comments').select('id, commenter_name, comment_text, created_at, is_approved, rejected_at, articles(title, category_slug, article_slug)').eq('is_approved', false).is('rejected_at', null).order('created_at', { ascending: false }).limit(100)
      : tab === 'fraud'
        ? db.from('fraud_accounts').select('id, platform, account_name, account_handle, status, reports_count, total_reported_loss, created_at').order('created_at', { ascending: false }).limit(100)
        : tab === 'reports'
          ? db.from('fraud_reports').select('id, reference_id, payment_method, amount, currency, region, description, created_at, fraud_account_id').order('created_at', { ascending: false }).limit(100)
          : db.from('tips').select('id, tip_text, location, status, created_at, led_to_article_id').order('created_at', { ascending: false }).limit(100);
    const { data, error } = await q;
    if (error) setErr(error.message);
    setRows(data ?? []);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<{ error: any }>) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) setErr(error.message); else load();
  };
  const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  return (
    <div className="mx-auto max-w-5xl p-6 font-sans">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Moderation</h1><Link href="/admin" className="text-sm underline">Dashboard</Link></div>
      <div className="mb-4 flex gap-2">
        {(['comments', 'fraud', 'reports', 'tips'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-sm ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {t === 'comments' ? 'Pending comments' : t === 'fraud' ? 'Fraud Watch accounts' : t === 'reports' ? 'Fraud reports' : 'Tips'}
          </button>
        ))}
      </div>
      {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {!rows.length && !err && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border p-3 text-sm">
            {tab === 'comments' && (<>
              <p className="text-xs text-muted-foreground">{r.commenter_name} · {new Date(r.created_at).toLocaleString('en-GB')} · {r.articles && <Link className="underline" href={`/${r.articles.category_slug}/${r.articles.article_slug}`}>{r.articles.title}</Link>}</p>
              <p className="my-2 whitespace-pre-wrap">{r.comment_text}</p>
              <div className="flex gap-2">
                <button disabled={busy} className="rounded bg-green-700 px-3 py-1 text-white" onClick={async () => { const m = await uid(); act(() => db.from('comments').update({ is_approved: true, moderated_by: m }).eq('id', r.id)); }}>Approve</button>
                <button disabled={busy} className="rounded bg-red-700 px-3 py-1 text-white" onClick={async () => { const m = await uid(); act(() => db.from('comments').update({ is_approved: false, rejected_at: new Date().toISOString(), moderated_by: m }).eq('id', r.id)); }}>Reject</button>
              </div>
            </>)}
            {tab === 'fraud' && (<>
              <p><b>{r.account_name || r.account_handle}</b> ({r.platform}) · status <b>{r.status}</b> · {r.reports_count} report(s){r.total_reported_loss ? ` · GH¢${r.total_reported_loss}` : ''}</p>
              <div className="mt-2 flex gap-2">
                <button disabled={busy || r.status === 'VerifiedScam'} className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-40" onClick={() => act(() => db.from('fraud_accounts').update({ status: 'VerifiedScam' }).eq('id', r.id))}>Approve (Verified scam)</button>
                <button disabled={busy || r.status === 'Cleared'} className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-40" onClick={() => act(() => db.from('fraud_accounts').update({ status: 'Cleared' }).eq('id', r.id))}>Reject (Cleared)</button>
                <button disabled={busy || r.status === 'Disputed'} className="rounded bg-muted px-3 py-1 disabled:opacity-40" onClick={() => act(() => db.from('fraud_accounts').update({ status: 'Disputed' }).eq('id', r.id))}>Disputed</button>
              </div>
            </>)}
            {tab === 'reports' && (<p>{r.reference_id} · {r.payment_method} · {r.amount ? `${r.currency ?? 'GHS'} ${r.amount}` : 'no amount'} · {r.region ?? 'no region'} · {new Date(r.created_at).toLocaleString('en-GB')}<br /><span className="whitespace-pre-wrap">{r.description}</span></p>)}
            {tab === 'tips' && (<>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('en-GB')} · {r.location || 'no location'} · {r.status}</p>
              <p className="my-2 whitespace-pre-wrap">{r.tip_text}</p>
              {r.status === 'new' && <button disabled={busy} className="rounded bg-muted px-3 py-1" onClick={() => act(() => db.from('tips').update({ status: 'reviewed' }).eq('id', r.id))}>Mark reviewed</button>}
              {r.led_to_article_id ? <span className="ml-2 text-xs text-green-700">Linked to article (tipster follow-up queued if they left an email)</span>
                : <button disabled={busy} className="ml-2 rounded bg-muted px-3 py-1" onClick={() => {
                    const id = window.prompt('Article ID (UUID) this tip led to:')?.trim();
                    if (id && /^[0-9a-f-]{36}$/i.test(id)) act(() => db.from('tips').update({ led_to_article_id: id }).eq('id', r.id));
                  }}>Led to article…</button>}
            </>)}
          </li>
        ))}
      </ul>
    </div>
  );
}
