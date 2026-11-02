import { notFound } from 'next/navigation';
import FraudWatchAccountView from '@/components/FraudWatchAccountView';
import { createServerClient } from '@/lib/supabase/server';

type Params = Promise<{ accountId: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FraudWatchAccountPage({ params }: { params: Params }) {
  const { accountId } = await params;
  if (!UUID.test(accountId)) notFound();
  // Only moderated (public) accounts have a page; unknown or pending ids are a real 404, not a soft one.
  const supabase = createServerClient();
  const { data, error } = await (supabase as any).from('fraud_accounts_public').select('id').eq('id', accountId).maybeSingle();
  if (!error && !data) notFound();
  return <FraudWatchAccountView accountId={accountId} />;
}
