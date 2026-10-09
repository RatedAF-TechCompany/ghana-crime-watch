import type { MetadataRoute } from 'next';
import { SITEMAP_BASE as BASE_URL } from '@/lib/feeds';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/api/og/', '/api/og-image'], disallow: ['/admin/', '/auth', '/api/', '/search'] },
    sitemap: [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/news-sitemap.xml`],
  };
}
