import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import AuthView from '@/components/AuthView';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in or create an account on GhanaCrimes.',
  alternates: { canonical: `${BASE_URL}/auth` },
};

export default function AuthPage() {
  return (
    <Layout>
      <AuthView />
    </Layout>
  );
}
