import { formatDistanceToNow } from 'date-fns';
import { formatGhanaDate, formatGhanaTime, formatPublished } from '@/lib/article-meta';

/** Absolute UK stamp without the word Published: "3 Nov 2026, 14:05 GMT". */
export function getStamp(date: string | Date): string {
  const iso = (typeof date === 'string' ? new Date(date) : date).toISOString();
  return `${formatGhanaDate(iso)}, ${formatGhanaTime(iso)}`;
}

/** Admin-only relative time ("5 minutes ago"). Public pages use getPublishedTime. */
export function getAdminRelativeTime(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true }).replace('about ', '');
}

/** Public timestamps are absolute: "Published 3 Nov 2026, 14:05 GMT" (UK time, GMT/BST). */
export function getRelativeTime(date: string | Date): string {
  return getPublishedTime(date);
}

export function getPublishedTime(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatPublished(parsedDate.toISOString());
}

export function getAbsoluteTime(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return parsedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function isRecent(date: string | Date, thresholdMinutes = 60): boolean {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return Date.now() - parsedDate.getTime() < thresholdMinutes * 60 * 1000;
}

export function getReadingTime(text: string): string {
  // Average reading speed is ~200-250 words per minute
  const wordsPerMinute = 200;
  const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  if (minutes < 1) return '1 min read';
  return `${minutes} min read`;
}
