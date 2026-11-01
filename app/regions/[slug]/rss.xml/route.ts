import { buildRss } from '@/lib/feeds';
import { getRegion } from '@/lib/hubs';

export const revalidate = 600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const r = getRegion((await params).slug);
  if (!r) return new Response('Not found', { status: 404 });
  return buildRss({
    self: `/regions/${r.slug}/rss.xml`, link: `/regions/${r.slug}`, title: `GhanaCrimes: ${r.name} Region`,
    description: `Crime news from the ${r.name} Region of Ghana`, limit: 50, maxAge: 600,
    filter: (q) => q.eq('region', r.name),
  });
}
