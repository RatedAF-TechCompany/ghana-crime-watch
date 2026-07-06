import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import AuthView from '@/components/AuthView';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in or create an account on GhanaCrimes.',
  alternates: { canonical: 'https://ghanacrimes.com/auth' },
};

export default function AuthPage() {
  return (
    <Layout>
      <AuthView />
    </Layout>
  );
}
