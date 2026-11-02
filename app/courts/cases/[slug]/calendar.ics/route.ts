import { getCourtCase } from '@/lib/court-cases';
import { courtIcs, icsResponse } from '@/lib/ics';

export const revalidate = 1800;
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getCourtCase(slug);
  if (!r) return new Response('Not found', { status: 404 });
  return icsResponse(courtIcs([r.c], r.c.title), `${slug}.ics`);
}
