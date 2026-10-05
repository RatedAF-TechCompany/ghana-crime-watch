"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const db = supabase as any;
const OFFICIAL = /^https:\/\/([a-z0-9-]+\.)*(police\.gov\.gh|interpol\.int)(\/|$)/i;

export default function NoticesAdminView() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState({ kind: 'wanted', person_name: '', details: '', agency: 'Ghana Police Service', official_url: '', photo_url: '', date_seen: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const { data } = await db.from('official_notices').select('*').order('created_at', { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setIsAdmin(false);
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!data);
      if (data) load();
    })();
  }, []);

  const save = async () => {
    setMsg('');
    if (!OFFICIAL.test(f.official_url)) return setMsg('Official URL must be an https link on police.gov.gh or interpol.int.');
    if (f.photo_url && !OFFICIAL.test(f.photo_url)) return setMsg('Photo must come from the official notice (police.gov.gh or interpol.int).');
    if (f.person_name.trim().length < 2) return setMsg('Enter the name exactly as it appears in the notice.');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await db.from('official_notices').insert({
      ...f, person_name: f.person_name.trim(), details: f.details.trim() || null, photo_url: f.photo_url || null, created_by: user?.id,
    });
    if (error) return setMsg(error.message);
    setMsg('Saved as unpublished. Check it against the notice, then publish.');
    setF({ ...f, person_name: '', details: '', official_url: '', photo_url: '' });
    load();
  };

  const toggle = async (r: any) => { await db.from('official_notices').update({ is_published: !r.is_published }).eq('id', r.id); load(); };
  const remove = async (r: any) => { if (confirm('Remove this notice (e.g. withdrawn by the agency)?')) { await db.from('official_notices').delete().eq('id', r.id); load(); } };

  if (isAdmin === null) return <p className="p-8 font-sans">Loading…</p>;
  if (!isAdmin) return <p className="p-8 font-sans">Admins only.</p>;

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8 font-sans">
      <div>
        <h1 className="font-serif text-3xl font-bold">Official notices</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only copy entries from Ghana Police Service or INTERPOL public notices. Never add names from readers, tips or social media.</p>
      </div>
      <div className="grid gap-3 border border-border p-4">
        <div className="flex gap-3">
          <select className="h-10 border border-input bg-background px-2" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="wanted">Wanted</option><option value="missing">Missing</option>
          </select>
          <select className="h-10 border border-input bg-background px-2" value={f.agency} onChange={(e) => setF({ ...f, agency: e.target.value })}>
            <option>Ghana Police Service</option><option>INTERPOL</option>
          </select>
          <Input type="date" value={f.date_seen} onChange={(e) => setF({ ...f, date_seen: e.target.value })} />
        </div>
        <Input placeholder="Name exactly as in the official notice" value={f.person_name} onChange={(e) => setF({ ...f, person_name: e.target.value })} maxLength={150} />
        <Input placeholder="Official notice URL (police.gov.gh or interpol.int)" value={f.official_url} onChange={(e) => setF({ ...f, official_url: e.target.value })} />
        <Input placeholder="Photo URL from the official notice (optional)" value={f.photo_url} onChange={(e) => setF({ ...f, photo_url: e.target.value })} />
        <Textarea placeholder="Details stated in the notice only (optional)" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} maxLength={1000} />
        <div className="flex items-center gap-3"><Button onClick={save}>Add notice</Button>{msg && <span className="text-sm text-muted-foreground">{msg}</span>}</div>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div><strong>{r.person_name}</strong> · {r.kind} · {r.agency} · <a href={r.official_url} target="_blank" rel="noreferrer" className="text-primary">notice</a></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(r)}>{r.is_published ? 'Unpublish' : 'Publish'}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r)}>Remove</Button>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-sm text-muted-foreground">No notices yet.</li>}
      </ul>
    </div>
  );
}
