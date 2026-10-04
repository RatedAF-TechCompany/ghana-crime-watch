import ReviewQueueView from '@/components/admin/ReviewQueueView';

export const metadata = { title: 'Review queue', robots: { index: false } };

export default function AdminReviewPage() {
  return <ReviewQueueView />;
}
