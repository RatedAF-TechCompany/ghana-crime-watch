import { formatDistanceToNow } from 'date-fns';

export function getRelativeTime(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true }).replace('about ', '');
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
