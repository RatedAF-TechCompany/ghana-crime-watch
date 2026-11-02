'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { REGION_LATLNG } from '@/lib/region-geo';

export type MapStory = { title: string; href: string; region: string; published_at: string };

/** Leaflet + OpenStreetMap tiles (free, attribution required). One circle per region, sized by story count. */
export function LiveCrimeMap({ stories }: { stories: MapStory[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: any;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView([7.95, -1.03], 6);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      const by: Record<string, MapStory[]> = {};
      for (const s of stories) if (REGION_LATLNG[s.region]) (by[s.region] ??= []).push(s);
      const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
      for (const [region, list] of Object.entries(by)) {
        L.circleMarker(REGION_LATLNG[region], { radius: 8 + Math.sqrt(list.length) * 5, color: '#b91c1c', fillColor: '#dc2626', fillOpacity: 0.45, weight: 1 })
          .bindPopup(`<strong>${esc(region)}: ${list.length} stor${list.length === 1 ? 'y' : 'ies'}</strong><ul style="margin:6px 0 0;padding-left:16px">${list.slice(0, 8).map((s) => `<li><a href="${esc(s.href)}">${esc(s.title)}</a></li>`).join('')}</ul>`)
          .addTo(map);
      }
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [stories]);
  return <div ref={ref} className="h-[480px] w-full rounded-md border border-border" role="region" aria-label="Map of stories by region" />;
}
