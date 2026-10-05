import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export type NoticeKind = 'wanted' | 'missing';

export interface OfficialNotice {
  id: string;
  kind: NoticeKind;
  person_name: string;
  details: string | null;
  agency: string;
  official_url: string;
  photo_url: string | null;
  date_seen: string;
}

/** Only admin-entered notices copied from police.gov.gh or interpol.int (enforced in the database). */
export const getNotices = cache(async (kind: NoticeKind): Promise<OfficialNotice[]> => {
  const supabase = createServerClient() as any;
  const { data } = await supabase
    .from('official_notices')
    .select('id, kind, person_name, details, agency, official_url, photo_url, date_seen')
    .eq('kind', kind)
    .eq('is_published', true)
    .order('date_seen', { ascending: false })
    .limit(100);
  return (data ?? []) as OfficialNotice[];
});
