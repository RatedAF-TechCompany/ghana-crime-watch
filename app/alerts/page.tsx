import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { PushOptIn } from '@/components/PushOptIn';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { WhatsAppFollowBlock } from '@/components/WhatsAppFollowBlock';
import { BASE_URL } from '@/lib/utils';
import { REGIONS, TOPICS } from '@/lib/hubs';

export const metadata: Metadata = {
  title: 'Crime alerts and RSS feeds',
  description: 'Follow GhanaCrimes by region or topic with free RSS feeds, and send the desk a tip.',
  alternates: { canonical: `${BASE_URL}/alerts`, types: { 'application/rss+xml': `${BASE_URL}/rss.xml` } },
};

const linkCls = 'text-primary hover:underline';

export default function AlertsPage() {
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Alerts</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Follow the stories you care about</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Every GhanaCrimes feed below is free and updates as stories publish. Paste a feed link into any RSS reader
          (for example Feedly, Inoreader or your phone&apos;s news app) to get new reports for a region or topic.
        </p>
        <WhatsAppFollowBlock className="mt-6" />

        <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Breaking alerts on this device</h2>
        <div className="mt-3"><PushOptIn /></div>

        <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Daily Crime Brief by email</h2>
        <div className="mt-3"><NewsletterSignup /></div>

        <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Main feeds</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li><a className={linkCls} href="/rss.xml">All stories</a></li>
          <li><a className={linkCls} href="/latest/rss.xml">Live crime wire (newest 100)</a></li>
        </ul>

        <h2 className="mt-8 font-serif text-xl font-bold text-foreground">By region</h2>
        <ul className="mt-3 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {REGIONS.map((r) => <li key={r.slug}><a className={linkCls} href={`/regions/${r.slug}/rss.xml`}>{r.name}</a></li>)}
        </ul>

        <h2 className="mt-8 font-serif text-xl font-bold text-foreground">By topic</h2>
        <ul className="mt-3 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {TOPICS.map((t) => <li key={t.slug}><a className={linkCls} href={`/topics/${t.slug}/rss.xml`}>{t.label}</a></li>)}
        </ul>

        <h2 className="mt-8 font-serif text-xl font-bold text-foreground">Seen something?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Send the desk a tip about an arrest, court case, scam or incident. We verify before we publish and protect sources.
          In an emergency, call the police first: see <Link className={linkCls} href="/emergency-contacts">emergency contacts</Link>.
        </p>
        <p className="mt-3"><Link href="/tips" className="inline-block rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Send a tip</Link></p>
        <p className="mt-8 text-xs text-muted-foreground">We do not run email or SMS alerts at the moment.</p>
      </div>
    </Layout>
  );
}
