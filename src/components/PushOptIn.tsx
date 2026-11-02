'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VAPID_PUBLIC_KEY } from '@/lib/push';
import { getMyRegion } from '@/lib/my-region';

const b64 = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };

/** Real browser push alerts (VAPID). Only a few breaking stories a day. */
export function PushOptIn() {
  const [state, setState] = useState<'unsupported' | 'idle' | 'on' | 'denied' | 'busy' | 'err'>('idle');
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setState('unsupported'); return; }
    if (Notification.permission === 'denied') { setState('denied'); return; }
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => s && setState('on')).catch(() => {});
  }, []);
  const enable = async () => {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== 'granted') { setState('denied'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC_KEY) });
      const j = sub.toJSON() as any;
      const { error } = await (supabase as any).rpc('save_push_subscription', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh ?? null, p_auth: j.keys?.auth ?? null, p_region: getMyRegion() });
      setState(error ? 'err' : 'on');
    } catch { setState('err'); }
  };
  const disable = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await (supabase as any).rpc('disable_push_subscription', { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
    setState('idle');
  };
  if (state === 'unsupported') return <p className="font-sans text-sm text-muted-fg">This browser does not support push alerts. On iPhone, add GhanaCrimes to your Home Screen first.</p>;
  if (state === 'denied') return <p className="font-sans text-sm text-muted-fg">Notifications are blocked for this site in your browser settings.</p>;
  if (state === 'on') return <p className="font-sans text-sm">Push alerts are on. <button type="button" className="underline" onClick={disable}>Turn off</button></p>;
  return (
    <div className="font-sans text-sm">
      <button type="button" onClick={enable} disabled={state === 'busy'} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Turn on breaking alerts</button>
      {state === 'err' && <p className="mt-2 text-red-700">Could not turn on alerts. Try again.</p>}
      <p className="mt-2 text-[11px] text-muted-fg">At most 4 alerts a day. No account needed.</p>
    </div>
  );
}
