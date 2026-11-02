import { getCourtCases } from '@/lib/court-cases';
import { courtIcs, icsResponse } from '@/lib/ics';

export const revalidate = 1800;
export async function GET() {
  const { upcoming } = await getCourtCases();
  return icsResponse(courtIcs(upcoming), 'ghanacrimes-court-hearings.ics');
}
