import { formatPublished } from '@/lib/article-meta';

/** Public timestamp: "Published 3 Nov 2026, 14:05 GMT" (UK time, GMT/BST). Never relative. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return <time dateTime={iso} className={className}>{formatPublished(iso)}</time>;
}
