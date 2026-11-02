import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

const WINDOW_HOURS = 72;

type Thread = { id: string; thread_slug: string; title: string; content_updated_at: string | null };

/** Live threads that actually moved recently (a new update, or the thread itself updated, in the last 72h). */
async function getDevelopingThreads(): Promise<Thread[]> {
  try {
    const supabase = createServerClient() as any;
    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
    const { data: recentUpdates } = await supabase
      .from('thread_updates').select('thread_id').gte('published_at', since).limit(200);
    const ids = [...new Set(((recentUpdates ?? []) as { thread_id: string }[]).map((u) => u.thread_id).filter(Boolean))];
    const or = ids.length ? `content_updated_at.gte.${since},id.in.(${ids.join(',')})` : `content_updated_at.gte.${since}`;
    const { data } = await supabase
      .from('story_threads')
      .select('id, thread_slug, title, content_updated_at')
      .eq('is_live', true)
      .is('live_ended_at', null)
      .or(or)
      .order('content_updated_at', { ascending: false, nullsFirst: false })
      .limit(5);
    return ((data ?? []) as Thread[]).filter((t) => !/qa-test|-test-/i.test(t.thread_slug));
  } catch {
    return [];
  }
}

export async function DevelopingNow() {
  const threads = await getDevelopingThreads();
  if (!threads.length) return null;
  return (
    <section aria-labelledby="developing-now" className="mb-10 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
      <h2 id="developing-now" className="mb-2 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.16em] text-primary">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden /> Developing now
      </h2>
      <ul className="space-y-1.5">
        {threads.map((t) => (
          <li key={t.id}>
            <Link href={`/live/${t.thread_slug}`} className="font-headline text-base font-bold leading-snug hover:text-primary hover:underline">
              {t.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
