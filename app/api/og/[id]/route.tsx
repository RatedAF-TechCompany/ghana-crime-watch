import { ImageResponse } from 'next/og';
import { createServerClient } from '@/lib/supabase/server';
import { getCategoryLabel } from '@/lib/categories';
import { getRegion, getTopic } from '@/lib/hubs';
import { OG_HEIGHT, OG_WIDTH, formatGhanaDate } from '@/lib/article-meta';

export const revalidate = 3600;

type Card = { headline: string; kicker: string; region?: string | null; date?: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCard(id: string): Promise<Card> {
  const supabase = createServerClient();
  if (UUID.test(id)) {
    const { data } = await supabase.from('articles').select('title, category_slug, region, published_at')
      .eq('id', id).eq('is_published', true).maybeSingle();
    if (data) return { headline: data.title, kicker: getCategoryLabel(data.category_slug), region: data.region, date: data.published_at };
  }
  if (id.startsWith('topic-')) {
    const t = getTopic(id.slice(6));
    if (t) return { headline: `${t.label} in Ghana`, kicker: 'Topic' };
  }
  if (id.startsWith('region-')) {
    const r = getRegion(id.slice(7));
    if (r) return { headline: `Crime news from the ${r.name} Region`, kicker: 'Region', region: r.name };
  }
  if (id.startsWith('live-')) {
    const { data } = await supabase.from('story_threads').select('title, live_started_at, created_at')
      .eq('thread_slug', id.slice(5)).maybeSingle();
    if (data) return { headline: data.title, kicker: 'Live updates', date: data.live_started_at || data.created_at };
  }
  return { headline: 'Ghana crime news and court reports', kicker: 'GhanaCrimes' };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await resolveCard(decodeURIComponent(id));
  const headline = card.headline.length > 140 ? `${card.headline.slice(0, 137)}...` : card.headline;
  const meta = [card.kicker, card.region ? `${card.region.replace(/\s+region$/i, '')} Region` : null, card.date ? formatGhanaDate(card.date) : null]
    .filter(Boolean).join('  |  ');
  const size = headline.length > 90 ? 52 : headline.length > 55 ? 62 : 72;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: '#111111', color: '#F7F1E1', padding: '64px 72px', borderLeft: '18px solid #9A0044' }}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: '#E8A3C0' }}>{meta}</div>
        <div style={{ display: 'flex', fontSize: size, fontWeight: 700, lineHeight: 1.12 }}>{headline}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>
            <span>Ghana</span><span style={{ color: '#E0457F' }}>Crimes</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#BDB6A6' }}>ghanacrimes.com</div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    },
  );
}
