import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import { BASE_URL } from '@/lib/utils';
import LiveThreadView from '@/components/LiveThreadView';
import { createServerClient } from '@/lib/supabase/server';

type Params = Promise<{ threadSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { threadSlug } = await params;
  const supabase = createServerClient();
  const { data: thread } = await supabase
    .from('story_threads')
    .select('title, summary, thread_slug')
    .eq('thread_slug', threadSlug)
    .maybeSingle();

  if (!thread) {
    return { title: 'Live Updates Not Found' };
  }

  const title = `${thread.title} - live updates`;
  const description = thread.summary || `Follow live updates on ${thread.title}.`;
  const canonical = `${BASE_URL}/live/${threadSlug}`;
  const socialImage = `${BASE_URL}/og-image.png`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'GhanaCrimes',
      images: [{ url: socialImage }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@GhanaCrimes',
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function LiveThreadPage({ params }: { params: Params }) {
  const { threadSlug } = await params;
  return (
    <Layout>
      <LiveThreadView threadSlug={threadSlug} />
    </Layout>
  );
}
