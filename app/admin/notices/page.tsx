import NoticesAdminView from '@/components/admin/NoticesAdminView';

export const metadata = { title: 'Official notices', robots: { index: false } };

export default function AdminNoticesPage() {
  return <NoticesAdminView />;
}
