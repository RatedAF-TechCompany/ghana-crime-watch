import { REGIONS, type StoryCounts } from '@/lib/hubs';
import { offenceInfo } from '@/lib/crime-labels';

export const PERIODS = [{ days: 30, label: '30 days' }, { days: 90, label: '90 days' }, { days: 365, label: '12 months' }] as const;

export function parsePeriod(v?: string | string[]): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return PERIODS.some((p) => p.days === n) ? n : 90;
}

/** Crime types shown in filters: offence_type values grouped by their public label (e.g. fraud + fraud_cyber = Fraud). */
export function crimeTypes(c: StoryCounts) {
  const m = new Map<string, { key: string; label: string; raw: string[]; count: number }>();
  for (const [raw, n] of Object.entries(c.offences)) {
    const info = offenceInfo(raw);
    if (!info) continue;
    const key = info.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const g = m.get(key) ?? { key, label: info.label, raw: [], count: 0 };
    g.raw.push(raw); g.count += n; m.set(key, g);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

export function pick(v?: string | string[]) { return (Array.isArray(v) ? v[0] : v) || ''; }

/** Region counts, optionally restricted to one crime type. */
export function regionCountsFor(c: StoryCounts, typeRaw: string[] | null) {
  return REGIONS.map((r) => ({
    ...r,
    count: typeRaw ? c.region_offence.filter(([reg, off]) => reg === r.name && typeRaw.includes(off)).reduce((s, x) => s + x[2], 0) : c.regions[r.name] ?? 0,
  }));
}

export function qs(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && !(k === 'days' && Number(v) === 90)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
}
