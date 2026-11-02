import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import ResetPasswordView from '@/components/ResetPasswordView';

export const metadata: Metadata = { title: 'Set password', robots: { index: false, follow: false } };

export default function Page() { return <Layout><ResetPasswordView /></Layout>; }
