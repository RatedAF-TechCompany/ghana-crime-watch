'use client';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** "Follow this story": email alert (double opt-in) when the article, live thread or court case gets an update. */
export function FollowStory({ articleId, threadId, caseId, label = 'story' }: { articleId?: string; threadId?: string; caseId?: string; label?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'err'>('idle');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    const { data, error } = await (supabase as any).rpc('follow_story', { p_email: email, p_article: articleId ?? null, p_thread: threadId ?? null, p_case: caseId ?? null });
    setState(error || !data ? 'err' : 'sent');
  };
  if (state === 'sent') return <p className="my-6 rounded-md border border-border p-3 font-sans text-sm">Check your inbox and confirm. We will email you only when this {label} is updated.</p>;
  return (
    <form onSubmit={submit} className="my-6 rounded-md border border-border p-3 font-sans">
      <label htmlFor="follow-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]">Follow this {label}</label>
      <div className="flex gap-2">
        <input id="follow-email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <button type="submit" disabled={state === 'busy'} className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Email me updates</button>
      </div>
      {state === 'err' && <p className="mt-2 text-xs text-red-700">That did not work. Check the email address and try again.</p>}
      <p className="mt-2 text-[11px] text-muted-fg">One email per update. Unsubscribe from any alert.</p>
    </form>
  );
}
