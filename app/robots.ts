import type { MetadataRoute } from 'next';
import { SITEMAP_BASE as BASE_URL } from '@/lib/feeds';

const ALLOW = ['/', '/api/og/', '/api/og-image'];
const DISALLOW = ['/admin/', '/auth', '/api/', '/search', '/fraud-watch/search'];
// SEO-tool crawlers (not search engines) generate most of our load on retired URLs; slow them down.
const SLOW_BOTS = ['SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'PetalBot', 'BLEXBot', 'DataForSeoBot', 'serpstatbot', 'Barkrowler'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
      { userAgent: SLOW_BOTS, allow: ALLOW, disallow: DISALLOW, crawlDelay: 20 },
    ],
    sitemap: [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/news-sitemap.xml`],
  };
}
