import { buildRss } from '@/lib/feeds';
import { getTopic, topicFilter } from '@/lib/hubs';

export const revalidate = 600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = getTopic((await params).slug);
  if (!t) return new Response('Not found', { status: 404 });
  return buildRss({
    self: `/topics/${t.slug}/rss.xml`, link: `/topics/${t.slug}`, title: `GhanaCrimes: ${t.label}`,
    description: t.intro, limit: 50, maxAge: 600,
    filter: (q) => q.or(topicFilter(t)),
  });
}
