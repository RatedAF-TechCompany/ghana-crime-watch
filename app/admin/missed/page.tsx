import MissedStoriesView from '@/components/admin/MissedStoriesView';

export const metadata = { title: 'Missed stories', robots: { index: false } };

export default function AdminMissedPage() {
  return <MissedStoriesView />;
}
