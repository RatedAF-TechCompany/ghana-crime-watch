import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { TokenAction } from '@/components/TokenAction';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = '' } = await searchParams;
  return (
    <Layout>
      <div className="mx-auto max-w-xl py-10">
        <h1 className="mb-6 font-serif text-3xl font-bold">Confirm your email</h1>
        <TokenAction token={t} mode="confirm" />
      </div>
    </Layout>
  );
}
