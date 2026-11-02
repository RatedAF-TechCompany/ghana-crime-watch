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

type Updated = { article_id: string; posted_at: string; title: string; href: string };

/** Published articles that got a material dated update in the last 72h (story_updates). */
async function getUpdatedStories(): Promise<Updated[]> {
  try {
    const supabase = createServerClient() as any;
    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
    const { data } = await supabase.from('story_updates')
      .select('article_id, posted_at, articles!inner(title, category_slug, article_slug, is_published)')
      .eq('is_material', true).gte('posted_at', since).eq('articles.is_published', true)
      .order('posted_at', { ascending: false }).limit(20);
    const seen = new Set<string>();
    const out: Updated[] = [];
    for (const r of (data ?? []) as any[]) {
      if (seen.has(r.article_id)) continue;
      seen.add(r.article_id);
      out.push({ article_id: r.article_id, posted_at: r.posted_at, title: r.articles.title, href: `/${r.articles.category_slug}/${r.articles.article_slug}` });
    }
    return out.slice(0, 5);
  } catch {
    return [];
  }
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });

export async function DevelopingNow() {
  const [threads, updated] = await Promise.all([getDevelopingThreads(), getUpdatedStories()]);
  if (!threads.length && !updated.length) return null;
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
        {updated.map((u) => (
          <li key={u.article_id} className="flex items-baseline gap-2">
            <time dateTime={u.posted_at} className="shrink-0 font-sans text-[11px] font-bold text-primary">Updated {hhmm(u.posted_at)} GMT</time>
            <Link href={u.href} className="font-headline text-base font-bold leading-snug hover:text-primary hover:underline">{u.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
