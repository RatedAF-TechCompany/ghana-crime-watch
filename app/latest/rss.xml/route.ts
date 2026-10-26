import { buildRss } from '@/lib/feeds';

export const revalidate = 120;

export function GET() {
  return buildRss({ self: '/latest/rss.xml', title: 'GhanaCrimes Live Crime Wire', limit: 100, maxAge: 120 });
}
