import { formatDistanceToNow } from 'date-fns';

export function getRelativeTime(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true }).replace('about ', '');
}
