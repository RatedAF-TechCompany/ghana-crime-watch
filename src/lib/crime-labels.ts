import { formatPublished } from '@/lib/article-meta';
import { REGIONS } from '@/lib/hubs';

const OFFENCE: Record<string, { label: string; href: string }> = {
  robbery: { label: 'Robbery', href: '/violent-crime' },
  murder: { label: 'Murder', href: '/violent-crime' },
  assault: { label: 'Assault', href: '/violent-crime' },
  kidnapping: { label: 'Kidnapping', href: '/violent-crime' },
  mob_violence: { label: 'Mob violence', href: '/violent-crime' },
  firearms: { label: 'Firearms', href: '/violent-crime' },
  arson: { label: 'Arson', href: '/property-crime' },
  fraud_cyber: { label: 'Fraud', href: '/fraud-scams' },
  fraud: { label: 'Fraud', href: '/fraud-scams' },
  cybercrime: { label: 'Cybercrime', href: '/cybercrime' },
  data_protection: { label: 'Cyber & data', href: '/cybercrime' },
  narcotics: { label: 'Drugs', href: '/drug-offences' },
  drug_trafficking: { label: 'Drugs', href: '/drug-offences' },
  galamsey: { label: 'Galamsey', href: '/organised-crime' },
  human_trafficking: { label: 'Trafficking', href: '/organised-crime' },
  corruption: { label: 'Corruption', href: '/white-collar-crime' },
  court_judgement: { label: 'Court', href: '/court-cases' },
  law_enforcement: { label: 'Police', href: '/police-reports' },
  road_crash: { label: 'Road crash', href: '/traffic-offences' },
  road_crash_arrest: { label: 'Road crash', href: '/traffic-offences' },
  sexual_offence: { label: 'Sexual offence', href: '/violent-crime' },
};

export function offenceInfo(t?: string | null) {
  if (!t) return null;
  return OFFENCE[t] ?? { label: t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), href: '/top-stories' };
}

/** Normalises free-text regions ("Volta Region", "Accra") to the 16 regions. Multi-region/national values return null. */
export function regionInfo(r?: string | null): { name: string; slug: string } | null {
  if (!r) return null;
  const s = r.replace(/\s+region$/i, '').trim().toLowerCase();
  if (/,| and /.test(s)) return null;
  const alias = s === 'accra' ? 'greater accra' : s;
  const hit = REGIONS.find((x: { name: string }) => x.name.toLowerCase() === alias);
  return hit ? { name: hit.name, slug: hit.slug } : null;
}

const STATUS_TEXT: Record<string, string> = {
  reported: 'Reported', arrested: 'Arrested', charged: 'Charged', remanded: 'Remanded',
  on_trial: 'On trial', convicted: 'Convicted', acquitted: 'Acquitted',
  pleaded_guilty: 'Pleaded guilty', under_investigation: 'Under investigation', discharged: 'Discharged',
};

/** Short case-status label for badges.  */
const STATUS_LABEL: Record<string, { label: string; tone: 'neutral' | 'pending' | 'final' }> = {
  arrested: { label: 'Arrested', tone: 'pending' },
  charged: { label: 'Charged', tone: 'pending' },
  remanded: { label: 'Remanded', tone: 'pending' },
  on_trial: { label: 'On trial', tone: 'pending' },
  pleaded_guilty: { label: 'Pleaded guilty', tone: 'final' },
  convicted: { label: 'Convicted', tone: 'final' },
  acquitted: { label: 'Acquitted', tone: 'final' },
  discharged: { label: 'Discharged', tone: 'final' },
  under_investigation: { label: 'Under investigation', tone: 'neutral' },
};
export function caseStatusLabel(s?: string | null) { return s ? STATUS_LABEL[s] ?? null : null; }
export function caseStatusText(s?: string | null) { return s ? STATUS_TEXT[s] ?? null : null; }

/** Public timestamps are absolute: "Published 3 Nov 2026, 14:05 GMT". */
export function relTime(iso: string, _now?: number) { return formatPublished(iso); }
