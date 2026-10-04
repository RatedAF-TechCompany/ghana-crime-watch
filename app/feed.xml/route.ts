import { buildRss } from '@/lib/feeds';

export const revalidate = 300;

export function GET() {
  return buildRss();
}
