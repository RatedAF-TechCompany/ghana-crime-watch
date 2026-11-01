import Link from 'next/link';
import { Rss, Bell, MessageSquareWarning } from 'lucide-react';
import { WhatsAppFollowBlock } from '@/components/WhatsAppFollowBlock';

/** Replaces the old "daily digest launches soon" box: only channels that actually work today. */
export function FollowGhanaCrimes({ feedHref = '/rss.xml', feedLabel = 'All stories (RSS)' }: { feedHref?: string; feedLabel?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-serif text-lg font-bold">Follow GhanaCrimes</h3>
      <p className="mt-1 text-sm text-muted-foreground">Get new reports as they publish, or tell the desk what you have seen.</p>
      <ul className="mt-4 space-y-2 font-sans text-sm">
        <li><a href={feedHref} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"><Rss className="h-4 w-4" />{feedLabel}</a></li>
        <li><Link href="/alerts" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"><Bell className="h-4 w-4" />Region and topic feeds</Link></li>
        <li><Link href="/tips" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"><MessageSquareWarning className="h-4 w-4" />Send a tip</Link></li>
      </ul>
      <WhatsAppFollowBlock className="mt-4" />
    </div>
  );
}
