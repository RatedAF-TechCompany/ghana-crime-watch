import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { MomoChecker } from '@/components/MomoChecker';
import { createServerClient } from '@/lib/supabase/server';
import { BASE_URL } from '@/lib/utils';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fraud Watch directory: reviewed scam reports', description: 'Accounts and numbers reported to GhanaCrimes Fraud Watch that our moderators have reviewed.', alternates: { canonical: `${BASE_URL}/fraud-watch/directory` } };

const LABEL: Record<string, string> = { VerifiedScam: 'Verified scam', Disputed: 'Disputed', Cleared: 'Cleared' };

export default async function Directory() {
  const { data } = await (createServerClient() as any).from('fraud_accounts_public')
    .select('id, platform, account_name, account_handle, status, reports_count, last_reported_at').order('last_reported_at', { ascending: false, nullsFirst: false }).limit(500);
  const rows = (data ?? []) as any[];
  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Link href="/fraud-watch">Fraud Watch</Link></p>
        <h1 className="mt-2 font-serif text-3xl font-bold">Fraud Watch directory</h1>
        <p className="mt-2 mb-6 font-sans text-sm text-muted-fg">Only accounts a moderator has reviewed appear here. Reports waiting for review are never published. Listings reflect reader reports and our review, not a court finding.</p>
        <MomoChecker />
        {rows.length === 0 ? <p className="font-sans text-sm">No reviewed accounts yet. Reports are checked by a moderator before they are listed.</p> : (
          <table className="w-full font-sans text-sm"><thead><tr className="border-b text-left"><th className="py-1">Account</th><th>Platform</th><th>Status</th><th className="text-right">Reports</th></tr></thead>
            <tbody>{rows.map((r) => (<tr key={r.id} className="border-b border-border/50"><td className="py-1"><Link className="underline" href={`/fraud-watch/account/${r.id}`}>{r.account_name || r.account_handle}</Link></td><td>{r.platform}</td><td>{LABEL[r.status] ?? r.status}</td><td className="text-right">{r.reports_count}</td></tr>))}</tbody></table>)}
      </div>
    </Layout>
  );
}
