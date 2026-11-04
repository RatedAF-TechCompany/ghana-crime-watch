'use client';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Confirms or unsubscribes with a token from an email link. A button press (not page load) acts, so link scanners can't trigger it. */
export function TokenAction({ token, mode }: { token: string; mode: 'confirm' | 'unsubscribe' }) {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'bad'>('idle');
  const [what, setWhat] = useState<string | null>(null);
  const valid = /^[0-9a-f-]{36}$/i.test(token);
  const run = async () => {
    setState('busy');
    const { data, error } = await (supabase as any).rpc(mode === 'confirm' ? 'confirm_email_token' : 'unsubscribe_token', { t: token });
    if (error || !data) { setState('bad'); return; }
    setWhat(data as string); setState('ok');
  };
  if (!valid) return <p className="font-sans">This link is not valid. Copy the full link from the email.</p>;
  if (state === 'ok') return <p className="font-sans text-lg">{mode === 'confirm'
    ? (what === 'newsletter' ? 'Confirmed. Your first Crime Brief arrives at 7am GMT/BST (London time).' : 'Confirmed. We will email you when this story is updated.')
    : 'Done. You will not get these emails any more.'}</p>;
  if (state === 'bad') return <p className="font-sans">We could not find that link. It may already have been used, or it was copied incompletely.</p>;
  return (
    <button type="button" onClick={run} disabled={state === 'busy'} className="rounded-md bg-primary px-5 py-2.5 font-sans font-semibold text-primary-foreground">
      {mode === 'confirm' ? 'Confirm my email' : 'Unsubscribe'}
    </button>
  );
}
