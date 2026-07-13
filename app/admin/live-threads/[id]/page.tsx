import ThreadUpdatesView from '@/components/admin/ThreadUpdatesView';

type Params = Promise<{ id: string }>;

export default async function AdminThreadUpdatesPage({ params }: { params: Params }) {
  const { id } = await params;
  return <ThreadUpdatesView threadId={id} />;
}
