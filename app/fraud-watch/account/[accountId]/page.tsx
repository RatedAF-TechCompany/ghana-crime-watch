import FraudWatchAccountView from '@/components/FraudWatchAccountView';

type Params = Promise<{ accountId: string }>;

export default async function FraudWatchAccountPage({ params }: { params: Params }) {
  const { accountId } = await params;
  return <FraudWatchAccountView accountId={accountId} />;
}
