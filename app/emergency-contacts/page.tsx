import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { JsonLd } from '@/components/JsonLd';
import { BASE_URL } from '@/lib/utils';
import { NATIONAL, POLICE_REGIONS, SPECIALIST, VERIFIED_ON, type Contact } from '@/lib/emergency';

export const metadata: Metadata = {
  title: 'Emergency and crime-reporting contacts in Ghana',
  description: 'Police 191 and 18555, emergency 112, ambulance 193, fire 192, DOVVSU, CSA 292, EOCO and NACOC hotlines, and police regional commands, each with its official source.',
  alternates: { canonical: `${BASE_URL}/emergency-contacts` },
};

const verified = new Date(VERIFIED_ON).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function ContactCard({ c }: { c: Contact }) {
  return (
    <li className="rounded-md border border-border bg-card p-4">
      <h3 className="font-serif text-lg font-bold text-foreground">{c.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{c.what}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {c.lines.map((l) => (
          <li key={l.label}><span className="text-muted-foreground">{l.label}: </span>
            {l.tel ? <a href={`tel:${l.tel}`} className="font-bold text-primary hover:underline">{l.value}</a> : <strong>{l.value}</strong>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs"><a href={c.source.href} target="_blank" rel="noopener" className="text-muted-foreground underline hover:text-primary">Source: {c.source.label}</a></p>
    </li>
  );
}

export default function EmergencyContactsPage() {
  return (
    <Layout>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Emergency and crime-reporting contacts in Ghana', url: `${BASE_URL}/emergency-contacts`, dateModified: VERIFIED_ON }} />
      <div className="container mx-auto max-w-4xl px-4 py-8 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Safety</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Emergency and crime-reporting contacts</h1>
        <p className="mt-3 rounded-sm border-l-4 border-primary bg-card p-3 text-base">
          <strong>In an emergency call 191 (police) or 112.</strong> Give your location first, then what happened and whether anyone is hurt.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Every number below is copied from the official page linked under it, checked on {verified}. Numbers can change:
          if one does not work, use 191 or the agency&apos;s own website. GhanaCrimes is a news site and cannot take emergency reports.
        </p>

        <h2 className="mt-8 font-serif text-2xl font-bold">National emergency numbers</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">{NATIONAL.map((c) => <ContactCard key={c.name} c={c} />)}</ul>

        <h2 className="mt-10 font-serif text-2xl font-bold">Specialist units and agencies</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">{SPECIALIST.map((c) => <ContactCard key={c.name} c={c} />)}</ul>

        <h2 className="mt-10 font-serif text-2xl font-bold">Police regional commands</h2>
        <p className="mt-2 text-sm text-muted-foreground">Locations, phone numbers and emails as published by the Ghana Police Service. Where the police page lists no phone number, use 191 or 18555.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b border-border text-left"><th className="py-2 pr-3">Command</th><th className="py-2 pr-3">Headquarters</th><th className="py-2 pr-3">Phone</th><th className="py-2">Email</th></tr></thead>
            <tbody>
              {POLICE_REGIONS.map((r) => (
                <tr key={r.name} className="border-b border-border align-top">
                  <td className="py-2 pr-3"><a href={r.url} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">{r.name}</a></td>
                  <td className="py-2 pr-3">{r.location ?? <span className="text-muted-foreground">See police page</span>}{r.digitalAddress ? <span className="block text-xs text-muted-foreground">{r.digitalAddress}</span> : null}</td>
                  <td className="py-2 pr-3">{r.phones.length ? r.phones.map((p) => <a key={p} href={`tel:+233${p.replace(/^0/, '')}`} className="block hover:text-primary">{p}</a>) : <span className="text-muted-foreground">191 / 18555</span>}</td>
                  <td className="py-2 break-all">{r.emails.join(', ') || <span className="text-muted-foreground">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-8 text-sm">
          Related: <Link href="/explainers/your-rights-if-arrested-in-ghana" className="text-primary hover:underline">Your rights if arrested</Link> ·{' '}
          <Link href="/explainers/how-to-report-cybercrime-in-ghana" className="text-primary hover:underline">How to report cybercrime</Link> ·{' '}
          <Link href="/scam-alerts" className="text-primary hover:underline">Scam alerts</Link> ·{' '}
          <Link href="/safety" className="text-primary hover:underline">Safety guide</Link>
        </p>
      </div>
    </Layout>
  );
}
