'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, X } from 'lucide-react';
import { NATIONAL, POLICE_REGIONS } from '@/lib/emergency';
import { REGIONS } from '@/lib/hubs';
import { getMyRegion, setMyRegion, MY_REGION_EVENT } from '@/lib/my-region';

/** Article regions use "Greater Accra"; police.gov.gh names the command "Accra". */
const commandFor = (region: string | null) =>
  region ? POLICE_REGIONS.find((c) => c.name === (region === 'Greater Accra' ? 'Accra' : region)) ?? null : null;
const telOf = (p: string) => (p.startsWith('0') ? `+233${p.slice(1)}` : p);

/** Sticky SOS button: national numbers (MINT) plus the reader's regional police command (police.gov.gh). */
export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setRegion(getMyRegion());
    sync();
    window.addEventListener(MY_REGION_EVENT, sync);
    return () => window.removeEventListener(MY_REGION_EVENT, sync);
  }, []);
  const cmd = commandFor(region);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Emergency numbers"
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 rounded-full bg-red-700 px-4 py-2.5 font-sans text-sm font-bold text-white shadow-lg hover:bg-red-800 print:hidden">
        <Phone className="h-4 w-4" aria-hidden /> SOS
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="sos-title" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-card p-5 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 id="sos-title" className="font-headline text-xl font-bold">Emergency numbers</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mb-4 grid grid-cols-2 gap-2">
              {NATIONAL.flatMap((c) => c.lines.filter((l) => l.tel).slice(0, 1).map((l) => (
                <li key={c.name}>
                  <a href={`tel:${l.tel}`} className="block rounded-md border border-red-700/40 p-2 text-center font-sans hover:bg-red-50">
                    <span className="block text-xl font-bold text-red-700">{l.value}</span>
                    <span className="block text-[11px] leading-tight text-muted-fg">{c.name}</span>
                  </a>
                </li>
              )))}
            </ul>
            <label className="mb-1 block font-sans text-xs font-bold uppercase tracking-wider" htmlFor="sos-region">Your region</label>
            <select id="sos-region" value={region ?? ''} onChange={(e) => setMyRegion(e.target.value || null)} className="mb-3 h-10 w-full rounded-md border border-input bg-background px-2 font-sans text-sm">
              <option value="">Choose a region</option>
              {REGIONS.map((r) => <option key={r.slug} value={r.name}>{r.name}</option>)}
            </select>
            {region && (cmd ? (
              <div className="rounded-md bg-muted p-3 font-sans text-sm">
                <p className="font-bold">{cmd.name} Regional Police Command</p>
                {cmd.location && <p className="text-muted-fg">{cmd.location}</p>}
                {cmd.phones.length ? (
                  <ul className="mt-1 space-y-0.5">{cmd.phones.map((p) => <li key={p}><a className="text-primary underline" href={`tel:${telOf(p)}`}>{p}</a></li>)}</ul>
                ) : <p className="mt-1 text-muted-fg">police.gov.gh lists no phone for this command. Use 191 or 18555.</p>}
                <a href={cmd.url} target="_blank" rel="noopener" className="mt-1 inline-block text-xs underline">Source: police.gov.gh</a>
              </div>
            ) : <p className="font-sans text-sm text-muted-fg">No regional command listing for {region}. Use 191 or 18555.</p>)}
            <Link href="/emergency-contacts" className="mt-4 block text-center font-sans text-sm font-semibold text-primary underline" onClick={() => setOpen(false)}>All emergency and reporting contacts</Link>
          </div>
        </div>
      )}
    </>
  );
}
